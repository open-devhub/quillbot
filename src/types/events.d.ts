type CachedCommand = {
  name: string;
  description: string;
  usage: string;
  premium?: boolean;
  devOnly?: boolean;
  aliases?: string[];
  permissionsRequired?: PermissionResolvable[];
  react?: string;
  callback: Function;
};
