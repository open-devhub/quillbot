export type Log = {
  title: string;
  description: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp: boolean;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
};
