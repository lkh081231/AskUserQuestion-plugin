export interface Option {
  id: string;
  label: string;
  description?: string;
}

export interface SingleSelectQuestion {
  id: string;
  question: string;
  description?: string;
  type: "single_select";
  options: Option[];
  required: boolean;
  allow_other: boolean;
  placeholder?: string;
}

export interface QuestionFormData {
  title?: string;
  questions: SingleSelectQuestion[];
}

export interface SingleSelectAnswer {
  optionId?: string;
  otherSelected: boolean;
  otherText: string;
}
