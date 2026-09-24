const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const MAX_ANSWER_LENGTH = int(process.env.NEXT_PUBLIC_MAX_ANSWER_LENGTH, 10_000);
export const MAX_RECORDING_SECONDS = int(process.env.NEXT_PUBLIC_MAX_RECORDING_SECONDS, 300);
export const MAX_QUESTION_LENGTH = 1_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2_000;
export const MAX_QUESTIONS_PER_SURVEY = 50;
