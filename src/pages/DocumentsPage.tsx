/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Lock,
  Shield,
  Hash,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  X,
  FileCode2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { WorkspaceDocument } from '../types';
import { SearchHighlight } from '../components/SearchHighlight';

export function DocumentsPage() {
  const { user, tenant, token } = useAuth();
  const { addToast } = useToast();

  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals state
  const [viewingDoc, setViewingDoc] = useState<WorkspaceDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<WorkspaceDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'Strategy' | 'Engineering' | 'Financial' | 'Legal' | 'Compliance'>('Engineering');
  const [formClassification, setFormClassification] = useState<'CONFIDENTIAL' | 'RESTRICTED' | 'INTERNAL' | 'PUBLIC'>('CONFIDENTIAL');
  const [formContent, setFormContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isViewer = user?.role === 'viewer';
  const isAdmin = user?.role === 'admin';
  const canMutate = user?.role === 'admin' || user?.role === 'editor';

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/documents?q=${encodeURIComponent(searchQuery)}`
        : '/api/documents';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      } else {
        addToast('error', 'Fetch Failed', 'Unable to retrieve workspace documents');
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to communicate with documents endpoint');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, addToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormCategory('Engineering');
    setFormClassification('CONFIDENTIAL');
    setFormContent('');
    setIsCreating(true);
  };

  const handleOpenEditModal = (doc: WorkspaceDocument) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormClassification(doc.classification);
    setFormContent(doc.fullContent);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      addToast('warning', 'Validation', 'Title and content are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory,
          classification: formClassification,
          fullContent: formContent.trim()
        })
      });

      if (res.ok) {
        addToast('success', 'Document Created', 'Stored with verified tenant context and SHA-256 hash.');
        setIsCreating(false);
        fetchDocuments();
      } else {
        const err = await res.json();
        addToast('error', 'Creation Denied', err.error || 'Server authorization failure');
      }
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory,
          classification: formClassification,
          fullContent: formContent.trim()
        })
      });

      if (res.ok) {
        addToast('success', 'Document Updated', 'New version recorded and integrity hash regenerated.');
        setEditingDoc(null);
        fetchDocuments();
      } else {
        const err = await res.json();
        addToast('error', 'Update Denied', err.error || 'Authorization failure');
      }
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        addToast('success', 'Document Deleted', 'Document permanently purged from tenant workspace.');
        setDeletingDocId(null);
        fetchDocuments();
      } else {
        const err = await res.json();
        addToast('error', 'Delete Denied', err.error || 'Authorization failure');
      }
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'ALL' && doc.category !== selectedCategory) return false;
    return true;
  });

  const getClassificationBadge = (c: string) => {
    switch (c) {
      case 'CONFIDENTIAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      case 'RESTRICTED':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'INTERNAL':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant documents..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter documents by category"
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Engineering">Engineering</option>
            <option value="Financial">Financial</option>
            <option value="Strategy">Strategy</option>
            <option value="Legal">Legal</option>
            <option value="Compliance">Compliance</option>
          </select>

          {/* New Document Button */}
          <button
            onClick={handleOpenCreateModal}
            disabled={!canMutate}
            title={!canMutate ? 'Viewer role is read-only. Editor or Admin required.' : 'Create new document'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Document</span>
          </button>
        </div>
      </div>

      {/* Role Notice for Viewer */}
      {isViewer && (
        <div className="p-3 rounded-lg bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Signed in as <strong>{user?.name}</strong> with role <strong>VIEWER</strong>. You have read-only access to {tenant?.name} documents. Mutation actions are server-side blocked.
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900 text-indigo-200 border border-indigo-700">
            RBAC Enforced
          </span>
        </div>
      )}

      {/* Document Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading tenant partitioned records...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No documents found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No documents matching query '${searchQuery}' in current tenant space.`
              : 'This tenant currently has no active workspace documents.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getClassificationBadge(
                      doc.classification
                    )}`}
                  >
                    {doc.classification}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    <SearchHighlight text={doc.category} query={searchQuery} />
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 text-sm leading-snug group-hover:text-indigo-300 transition-colors">
                  <SearchHighlight text={doc.title} query={searchQuery} />
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  <SearchHighlight text={doc.contentSnippet} query={searchQuery} />
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1" title={`SHA-256: ${doc.contentHash}`}>
                    <Hash className="w-3 h-3 text-cyan-400" />
                    {doc.contentHash.slice(0, 8)}...
                  </span>
                  <span className="text-slate-400">v{doc.version}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    by {doc.updatedByName}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* View Button */}
                    <button
                      onClick={() => setViewingDoc(doc)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Inspect full content & cryptographic verification"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      disabled={!canMutate}
                      className="p-1.5 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={!canMutate ? 'Read-only role' : 'Edit document'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button (Admin only) */}
                    <button
                      onClick={() => setDeletingDocId(doc.id)}
                      disabled={!isAdmin}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={!isAdmin ? 'Admin role required to delete' : 'Delete document'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW DOCUMENT DETAIL MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getClassificationBadge(
                      viewingDoc.classification
                    )}`}
                  >
                    {viewingDoc.classification}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {viewingDoc.category}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300">
                    Version {viewingDoc.version}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  <SearchHighlight text={viewingDoc.title} query={searchQuery} />
                </h2>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Document ID:</span>
                <span className="text-slate-200">{viewingDoc.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Partitioned Tenant:</span>
                <span className="text-indigo-400">{viewingDoc.tenantId}</span>
              </div>
              <div className="flex justify-between">
                <span>SHA-256 Checksum:</span>
                <span className="text-cyan-400 truncate max-w-[280px]" title={viewingDoc.contentHash}>
                  {viewingDoc.contentHash}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-slate-300">{new Date(viewingDoc.updatedAt).toUTCString()}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono mb-1.5">
                Full Document Content
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                <SearchHighlight text={viewingDoc.fullContent} query={searchQuery} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DOCUMENT MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCreate}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" /> Create Workspace Document
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                placeholder="e.g., Q4 Enterprise Roadmap & Architecture"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Financial">Financial</option>
                  <option value="Strategy">Strategy</option>
                  <option value="Legal">Legal</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Classification</label>
                <select
                  value={formClassification}
                  onChange={(e: any) => setFormClassification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="INTERNAL">INTERNAL</option>
                  <option value="PUBLIC">PUBLIC</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content Body</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                required
                rows={5}
                placeholder="Enter confidential organizational records or architectural guidelines..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-indigo-300 font-mono">
              Enforced: Automatically stamped with server-side tenant ID: {tenant?.id}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Storing...' : 'Save & Protect Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT DOCUMENT MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" /> Edit Document [v{editingDoc.version}]
              </h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Financial">Financial</option>
                  <option value="Strategy">Strategy</option>
                  <option value="Legal">Legal</option>
                  <option value="Compliance">Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Classification</label>
                <select
                  value={formClassification}
                  onChange={(e: any) => setFormClassification(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="INTERNAL">INTERNAL</option>
                  <option value="PUBLIC">PUBLIC</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                required
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium"
              >
                {isSubmitting ? 'Updating...' : 'Update & Recompute Hash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDocId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">Permanently Delete Document?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-normal">
              This will remove document <code className="text-slate-100">{deletingDocId}</code> from your tenant workspace and log a security audit event. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDocId(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingDocId)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-medium"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
