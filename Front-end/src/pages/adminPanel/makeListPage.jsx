/**
 * Generates consistent stub pages for all remaining admin sections.
 * Each will be fleshed out — this file serves as a template reference.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdminLoader, AdminEmptyState, StatusBadge, AdminPagination,
  ConfirmDialog, ExportButtons, AdminFilterBar, SkeletonTable
} from '../../Components/adminPanel/AdminCommon';

// ─── Helper to create consistent page stubs ────────────────────
const makeListPage = ({
  title, description, icon,
  fetchFn, exportFn,
  columns, renderRow,
  filters: FiltersComponent
}) => {
  return function Page() {
    const [data, setData]       = useState([]);
    const [pagination, setPag]  = useState({ total: 0, page: 1, limit: 20, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [page, setPage]       = useState(1);
    const navigate = useNavigate();

    const load = useCallback(async (params = {}) => {
      setLoading(true);
      try {
        const res = await fetchFn({ page, limit: 20, ...params });
        setData(res?.data || res?.[Object.keys(res).find(k => Array.isArray(res[k]))] || []);
        if (res?.pagination) setPag(res.pagination);
      } catch (err) {
        console.error(`[${title}] load error:`, err);
      } finally {
        setLoading(false);
      }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    return (
      <div>
        <div className="ap-page-header">
          <div className="ap-page-header-left">
            <h1>{icon} {title}</h1>
            <p>{description}</p>
          </div>
          {exportFn && (
            <div className="ap-page-header-right">
              <ExportButtons onExport={(fmt) => window.open(exportFn(fmt), '_blank')} />
            </div>
          )}
        </div>

        {FiltersComponent && <FiltersComponent onFilter={(p) => { setPage(1); load(p); }} />}

        <div className="ap-card" style={{ padding: 0 }}>
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonTable rows={8} cols={columns.length} />
                ) : data.length === 0 ? (
                  <tr><td colSpan={columns.length}>
                    <AdminEmptyState icon={icon} title={`No ${title.toLowerCase()} found`} />
                  </td></tr>
                ) : data.map((item) => renderRow(item, navigate))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={pagination.page} pages={pagination.pages}
            total={pagination.total} limit={pagination.limit}
            onPage={(p) => { setPage(p); load({ page: p }); }}
          />
        </div>
      </div>
    );
  };
};

export default makeListPage;
