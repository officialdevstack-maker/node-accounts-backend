// validation/messages.ts
type SizeMessages = { numeric: string; string: string; array: string };

export const defaultMessages: Record<string, string | SizeMessages> = {
  required: "The :attribute field is required.",
  required_if: "The :attribute field is required when :other is :value.",
  required_unless: "The :attribute field is required unless :other is :value.",
  required_with: "The :attribute field is required when :values is present.",
  required_without: "The :attribute field is required when :values is not present.",
  accepted: "The :attribute field must be accepted.",

  string: "The :attribute field must be a string.",
  numeric: "The :attribute field must be a number.",
  integer: "The :attribute field must be an integer.",
  boolean: "The :attribute field must be true or false.",
  array: "The :attribute field must be an array.",

  email: "The :attribute field must be a valid email address.",
  url: "The :attribute field must be a valid URL.",
  ip: "The :attribute field must be a valid IP address.",
  uuid: "The :attribute field must be a valid UUID.",
  json: "The :attribute field must be a valid JSON string.",
  alpha: "The :attribute field must only contain letters.",
  alpha_num: "The :attribute field must only contain letters and numbers.",
  alpha_dash: "The :attribute field must only contain letters, numbers, dashes and underscores.",
  lowercase: "The :attribute field must be lowercase.",
  uppercase: "The :attribute field must be uppercase.",

  min: {
    numeric: "The :attribute field must be at least :min.",
    string: "The :attribute field must be at least :min characters.",
    array: "The :attribute field must have at least :min items.",
  },
  max: {
    numeric: "The :attribute field must not be greater than :max.",
    string: "The :attribute field must not be greater than :max characters.",
    array: "The :attribute field must not have more than :max items.",
  },
  between: {
    numeric: "The :attribute field must be between :min and :max.",
    string: "The :attribute field must be between :min and :max characters.",
    array: "The :attribute field must have between :min and :max items.",
  },
  size: {
    numeric: "The :attribute field must be :size.",
    string: "The :attribute field must be :size characters.",
    array: "The :attribute field must contain :size items.",
  },
  digits: "The :attribute field must be :digits digits.",
  digits_between: "The :attribute field must be between :min and :max digits.",

  in: "The selected :attribute is invalid.",
  not_in: "The selected :attribute is invalid.",
  regex: "The :attribute field format is invalid.",
  not_regex: "The :attribute field format is invalid.",
  starts_with: "The :attribute field must start with one of the following: :values.",
  ends_with: "The :attribute field must end with one of the following: :values.",

  confirmed: "The :attribute field confirmation does not match.",
  same: "The :attribute field must match :other.",
  different: "The :attribute field and :other must be different.",

  date: "The :attribute field must be a valid date.",
  after: "The :attribute field must be a date after :date.",
  after_or_equal: "The :attribute field must be a date after or equal to :date.",
  before: "The :attribute field must be a date before :date.",
  before_or_equal: "The :attribute field must be a date before or equal to :date.",

  unique: "The :attribute has already been taken.",
  exists: "The selected :attribute is invalid.",
};

export const FALLBACK_MESSAGE = "The :attribute field is invalid.";