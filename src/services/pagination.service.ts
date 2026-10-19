import type { PaginationQuery } from "../schemas/common.schema.js";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  next: string | null;
  prev: string | null;
}

/** Number of documents to skip to reach the requested page. */
export const skipFor = ({ page, limit }: PaginationQuery): number => (page - 1) * limit;

/**
 * Link to another page of the same list, as a relative query string. It keeps the
 * filters and sorting of the current request and only changes page and limit.
 */
const pageLink = (requestUrl: string, page: number, limit: number): string => {
  const { searchParams } = new URL(requestUrl, "http://localhost");
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  return `?${searchParams.toString()}`;
};

/** Everything a client needs to know where it is and how to reach the other pages. */
export const buildPaginationMeta = (
  { page, limit }: PaginationQuery,
  total: number,
  requestUrl: string,
): PaginationMeta => {
  // "|| 1": an empty list is still one (empty) page, never zero pages.
  const totalPages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    next: hasNextPage ? pageLink(requestUrl, page + 1, limit) : null,
    prev: hasPrevPage ? pageLink(requestUrl, page - 1, limit) : null,
  };
};
