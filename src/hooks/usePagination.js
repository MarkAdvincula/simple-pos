import { useState, useCallback } from 'react';

/**
 * Custom hook for managing pagination
 */
export const usePagination = (itemsPerPage = 20) => {
    const [page, setPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);

    const resetPagination = useCallback(() => {
        setPage(1);
        setHasMoreData(true);
    }, []);

    const loadNextPage = useCallback(() => {
        setPage(prev => prev + 1);
    }, []);

    const getPaginatedData = useCallback((data) => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = data.slice(startIndex, endIndex);
        const hasMore = endIndex < data.length;

        return {
            items: paginatedItems,
            hasMore,
            startIndex,
            endIndex
        };
    }, [page, itemsPerPage]);

    const getAllPagesData = useCallback((data) => {
        const endIndex = page * itemsPerPage;
        const allItems = data.slice(0, endIndex);
        const hasMore = endIndex < data.length;

        return {
            items: allItems,
            hasMore
        };
    }, [page, itemsPerPage]);

    return {
        page,
        hasMoreData,
        setPage,
        setHasMoreData,
        resetPagination,
        loadNextPage,
        getPaginatedData,
        getAllPagesData,
    };
};
