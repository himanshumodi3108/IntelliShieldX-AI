import { useState, useCallback } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  onPageChange?: (page: number) => void;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, initialLimit = 20, onPageChange } = options;
  
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [pagination, setPagination] = useState<PaginationState | null>(null);

  const goToPage = useCallback((newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.pages) {
      setPage(newPage);
      onPageChange?.(newPage);
    }
  }, [pagination, onPageChange]);

  const nextPage = useCallback(() => {
    if (pagination && page < pagination.pages) {
      goToPage(page + 1);
    }
  }, [page, pagination, goToPage]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      goToPage(page - 1);
    }
  }, [page, goToPage]);

  const resetPage = useCallback(() => {
    setPage(1);
    onPageChange?.(1);
  }, [onPageChange]);

  return {
    page,
    limit,
    pagination,
    setPagination,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    canGoNext: pagination ? page < pagination.pages : false,
    canGoPrevious: page > 1,
  };
}




