/**
 * AssetsPresenter — Desktop layout orchestrator
 *
 * Composes: Toolbar (with integrated filters), Table view, Detail Slideout
 */
import { useState } from 'react';
import type { AssetsState, AssetsActions } from './useAssetsLogic';
import { CONTENT_PANEL_STYLES } from '@/pages/dashboard/styles';
import { AssetsToolbar } from '@/components/assets/AssetsToolbar';
import { AssetsTable } from '@/components/assets/AssetsTable';
import { AssetDetailSlideout } from '@/components/assets/detail/AssetDetailSlideout';
import { CreateAssetModal } from '@/components/assets/forms/CreateAssetModal';

export interface AssetsPresenterProps {
  state: AssetsState;
  actions: AssetsActions;
}

export function AssetsPresenter({ state, actions }: AssetsPresenterProps) {
  const { isDark, filters, sort, pagination, selectedAssetId } = state;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const panelStyle = isDark ? CONTENT_PANEL_STYLES.dark : CONTENT_PANEL_STYLES.light;

  return (
    <div className="flex flex-col gap-4 px-8 pt-4 pb-8 w-full" style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toolbar with integrated search and filters */}
      <AssetsToolbar
        isDark={isDark}
        search={filters.search}
        filters={filters}
        canCreate={state.canCreate}
        onSearchChange={actions.setSearch}
        onFiltersChange={actions.setFilters}
        onResetFilters={actions.resetFilters}
        onCreateAsset={() => setShowCreateModal(true)}
      />

      {/* Main content area with optional detail slideout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Table view in glassmorphic card */}
        <div
          className="flex-1 min-w-0 overflow-hidden"
          style={panelStyle}
        >
          <AssetsTable
            isDark={isDark}
            filters={filters}
            sort={sort}
            pagination={pagination}
            selectedAssetId={selectedAssetId}
            onSort={actions.setSort}
            onPageChange={actions.setPage}
            onSelectAsset={actions.selectAsset}
          />
        </div>

        {/* Right: detail slideout */}
        {selectedAssetId && (
          <AssetDetailSlideout
            isDark={isDark}
            assetId={selectedAssetId}
            activeTab={state.activeDetailTab}
            canEdit={state.canEdit}
            canDelete={state.canDelete}
            onTabChange={actions.setDetailTab}
            onClose={() => actions.selectAsset(null)}
          />
        )}
      </div>

      {/* Create asset modal */}
      {showCreateModal && (
        <CreateAssetModal
          isDark={isDark}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

export default AssetsPresenter;
