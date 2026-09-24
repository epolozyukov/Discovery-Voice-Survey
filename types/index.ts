export type SurveyStatus = "draft" | "active" | "inactive";
export type ResponseStatus = "not_started" | "in_progress" | "completed";
export type InputMethod = "text" | "voice";

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  surveyId: string;
  order: number;
  text: string;
  required: boolean;
}

export interface Participant {
  id: string;
  surveyId: string;
  label: string;
  token: string;
}

export interface SurveyResponse {
  id: string;
  participantId: string;
  surveyId: string;
  status: ResponseStatus;
  startedAt: string | null;
  completedAt: string | null;
}

export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  answer: string;
  inputMethod: InputMethod;
  createdAt: string;
  updatedAt: string;
}
