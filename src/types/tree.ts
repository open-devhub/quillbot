export type RepoInfo = {
  owner: string;
  repo: string;
};

export interface TreeNode {
  [key: string]: TreeNode;
}

export type GitHubTreeEntry = {
  type?: string;
  path?: string;
};
