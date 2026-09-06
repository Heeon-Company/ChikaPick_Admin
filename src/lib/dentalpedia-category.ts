export interface AdminDentalpediaCategory {
  id: string;
  code: string;
  name: string;
  displayName: string;
  displayOrder: number;
  isActive: boolean;
  contentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDentalpediaCategoryInput {
  name: string;
  displayName: string;
  displayOrder: number;
  isActive: boolean;
}
