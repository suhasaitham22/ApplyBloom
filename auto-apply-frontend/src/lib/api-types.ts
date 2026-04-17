export interface StructuredResume {
  full_name: string;
  headline: string;
  contact: { email: string; phone: string; location: string };
  summary: string;
  skills: string[];
  experience: { heading: string; bullets: string[] }[];
  education: { heading: string; bullets: string[] }[];
  confidence: number;
}

export interface TailoredResume {
  headline: string;
  summary: string;
  skills: string[];
  experience: { heading: string; bullets: string[] }[];
  education: { heading: string; bullets: string[] }[];
  change_summary: string[];
}

export interface ChatReply {
  assistant_message: string;
  updated_resume: StructuredResume | null;
  operations: Array<
    | { op: "replace_summary"; value: string }
    | { op: "replace_headline"; value: string }
    | { op: "set_skills"; value: string[] }
    | { op: "rewrite_bullet"; section: "experience" | "education"; heading: string; index: number; value: string }
  >;
}

export interface ApiSuccess<T> {
  data: T;
  meta: { request_id: string };
}
