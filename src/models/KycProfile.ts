import { Model, type Cast } from '../lib/core/model/index.js';

export type KycStatus = 'pending' | 'verified' | 'rejected';

export class KycProfile extends Model {
  static table = 'kyc_profiles';
  static fillable = [
    'userId',
    'status',
    'bvnMasked',
    'bvnHash',
    'bvnEncrypted',
    'fullName',
    'dateOfBirth',
    'phone',
    'rejectionReason',
    'reviewedBy',
    'submittedAt',
    'reviewedAt',
  ];
  static hidden = ['bvnHash', 'bvnEncrypted'];
  static casts: Record<string, Cast> = {
    id: 'int',
    userId: 'int',
    dateOfBirth: 'date',
    submittedAt: 'date',
    reviewedAt: 'date',
  };

  declare id: number;
  declare userId: number;
  declare status: KycStatus;
  declare bvnMasked: string;
  declare bvnHash: string;
  declare bvnEncrypted: string;
  declare fullName: string;
  declare dateOfBirth: Date;
  declare phone: string;
  declare rejectionReason: string | null;
  declare reviewedBy: string | null;
  declare submittedAt: Date;
  declare reviewedAt: Date | null;
}
