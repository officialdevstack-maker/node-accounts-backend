import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { Activity } from '../models/Activity.js';
import { KycProfile } from '../models/KycProfile.js';
import { User } from '../models/User.js';
import { encryptBvn, hashBvn, maskBvn } from '../lib/kyc.js';

function profileView(profile: KycProfile | null) {
  if (!profile) return null;
  return {
    status: profile.status,
    bvnMasked: profile.bvnMasked,
    fullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth.toISOString().slice(0, 10),
    phone: profile.phone,
    rejectionReason: profile.rejectionReason,
    submittedAt: profile.submittedAt.toISOString(),
    reviewedAt: profile.reviewedAt?.toISOString() ?? null,
  };
}

class KycController extends Controller {
  async show(req: HttpRequest) {
    const user = this.user<User>(req);
    const profile = await KycProfile.where('user_id', user.id).first();
    return this.ok({ kyc: profileView(profile) });
  }

  async store(req: HttpRequest) {
    const user = this.user<User>(req);
    const data = await this.validate<{
      bvn: string;
      full_name: string;
      date_of_birth: string;
      phone: string;
    }>(req, {
      bvn: ['required', 'string', 'min:11', 'max:11'],
      full_name: ['required', 'string', 'max:180'],
      date_of_birth: ['required', 'date'],
      phone: ['required', 'string', 'max:20'],
    });

    const bvn = data.bvn.trim();
    if (!/^\d{11}$/.test(bvn)) {
      this.abort(422, 'Validation failed.', { bvn: ['BVN must be exactly 11 digits.'] });
    }

    const fullName = data.full_name.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) {
      this.abort(422, 'Validation failed.', { full_name: ['Enter your full name as registered with your BVN.'] });
    }

    const dateOfBirth = data.date_of_birth.trim();
    const dobTime = Date.parse(`${dateOfBirth}T00:00:00.000Z`);
    const dob = new Date(dobTime);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
      !Number.isFinite(dobTime) ||
      dob.toISOString().slice(0, 10) !== dateOfBirth
    ) {
      this.abort(422, 'Validation failed.', { date_of_birth: ['Enter a valid date of birth.'] });
    }
    const ageLimit = new Date();
    ageLimit.setUTCHours(0, 0, 0, 0);
    ageLimit.setUTCFullYear(ageLimit.getUTCFullYear() - 16);
    if (dob > ageLimit) {
      this.abort(422, 'Validation failed.', { date_of_birth: ['You must be at least 16 years old.'] });
    }

    const phone = data.phone.trim();
    if (!/^\+?[0-9\s-]{7,20}$/.test(phone)) {
      this.abort(422, 'Validation failed.', { phone: ['Enter a valid phone number.'] });
    }

    const existing = await KycProfile.where('user_id', user.id).first();
    if (existing?.status === 'verified') {
      this.abort(409, 'Your BVN has already been verified.');
    }

    const bvnHash = hashBvn(bvn);
    const now = new Date();
    const profile = await KycProfile.updateOrCreate(
      { userId: user.id },
      {
        status: 'pending',
        bvnMasked: maskBvn(bvn),
        bvnHash,
        bvnEncrypted: encryptBvn(bvn),
        fullName,
        dateOfBirth: dob,
        phone,
        rejectionReason: null,
        reviewedBy: null,
        submittedAt: now,
        reviewedAt: null,
      },
    );

    await Activity.record(user.id, 'kyc_submitted', { ip: req.ip(), userAgent: req.userAgent() });
    return this.ok({ kyc: profileView(profile) }, 'BVN submitted for review.');
  }
}

export const kycController = new KycController();
