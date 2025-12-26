export interface ConversionConfig {
  quality: string;
}

export type ConversionStatus = "idle" | "converting" | "completed" | "error";

export interface LogMessage {
  type: "info" | "error" | "progress";
  message: string;
}

export interface WorkerMessage {
  type: "load" | "convert";
  payload?: any;
}
