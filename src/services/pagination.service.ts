import type { PaginationQuery } from "../schemas/common.schema.js";

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Number of documents to skip to reach the requested page. */
export const skipFor = ({ page, limit }: PaginationQuery): number => (page - 1) * limit;

/** Everything a client needs to know where it is and how many pages there are. */
export const buildPaginationMeta = (
  { page, limit }: PaginationQuery,
  totalItems: number,
): PaginationMeta => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
