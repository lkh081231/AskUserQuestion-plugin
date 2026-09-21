export interface Option {
  id: string;
  label: string;
  description?: string;
}

interface BaseQuestion {
  id: string;
  question: string;
  description?: string;
  required: boolean;
  placeholder?: string;
}

export interface SingleSelectQuestion extends BaseQuestion {
  type: "single_select";
  options: Option[];
  allow_other: boolean;
}

export interface MultiSelectQuestion extends BaseQuestion {
  type: "multi_select";
  options: Option[];
  allow_other: boolean;
}

export interface TextQuestion extends BaseQuestion {
  type: "text";
  allow_other: false;
}

export interface ConfirmQuestion extends BaseQuestion {
  type: "confirm";
  allow_other: boolean;
}

export type Question =
  | SingleSelectQuestion
  | MultiSelectQuestion
  | TextQuestion
  | ConfirmQuestion;

export interface QuestionFormData {
  title?: string;
  questions: Question[];
}

export interface ChoiceAnswer {
  kind: "choice";
  optionIds: string[];
  optionNotes: Record<string, string>;
  otherSelected: boolean;
  otherText: string;
}

export interface TextAnswer {
  kind: "text";
  text: string;
}

export type Answer = ChoiceAnswer | TextAnswer;
export type Answers = Record<string, Answer>;
