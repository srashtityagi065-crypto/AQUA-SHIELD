export type AssistantQuery = {
  message: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  selectedLayer?: string;
  period?: string;
  scenario?: string;
};

export type AssistantAction = { type: "locate" | "select_layer" | "select_period"; value: string };

export type AssistantReply = {
  answer: string;
  actions?: AssistantAction[];
  status: "model_output" | "demo";
};
