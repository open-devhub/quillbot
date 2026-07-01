export type SupportDoc = {
  type: "feature" | "report";
  id: string;
  user: {
    id: string;
    tag: string;
  };
  server?: {
    id: string;
    name: string;
  };
  description: string;
  date: string;
};
