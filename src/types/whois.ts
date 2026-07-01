export type WhoisEvent = {
  eventAction?: string;
  eventDate?: string;
};

export type WhoisData = {
  events?: WhoisEvent[];
  entities?: Array<{ vcardArray?: unknown[][] }>;
  nameservers?: Array<{ ldhName?: string }>;
};
