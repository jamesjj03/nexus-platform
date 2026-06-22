/* eslint-disable @typescript-eslint/no-explicit-any */

export type NexusRole = "owner" | "admin" | "manager" | "crew";

export type NexusSession = {
  slug: string;
  role: NexusRole;
  remember: boolean;
  signedInAt: string;
  personId?: string;
  personName?: string;
  companyName?: string;
  accessLevel?: string;
  permissions?: string[];
};

export type NexusBoardData = {
  jobs: any[];
  equipment: any[];
  tools: any[];
  inventory: any[];
  issues: any[];
  staff: any[];
  crews?: any[];
  messages?: any[];
  requests: any[];
  checkouts?: any[];
  updatedAt?: string;
  companySlug?: string;
};

export type NexusLoginChallenge = {
  challenge: string;
  label: string;
  slug: string;
  companyName: string;
  role: NexusRole;
  personId?: string;
  personName?: string;
  mustChangePassword?: boolean;
};
