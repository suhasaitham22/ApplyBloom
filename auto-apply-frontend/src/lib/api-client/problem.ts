// RFC 7807 problem+json shape
export interface Problem {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  [k: string]: unknown;
}

export class ApiError extends Error {
  readonly problem: Problem;
  readonly requestId?: string;
  constructor(problem: Problem, requestId?: string) {
    super(problem.title);
    this.problem = problem;
    this.requestId = requestId;
  }
}

export function isProblem(x: unknown): x is Problem {
  return typeof x === "object" && x !== null && "title" in x && "status" in x;
}
