import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Image,
  Upload,
  Trash2,
  Search,
  Grid,
  List,
  Copy,
  Check,
  ExternalLink,
  Plus
} from "lucide-react";
import { useCMS } from "../context/CMSContext";
import CMSCard from "../components/shared/CMSCard";
import CMSModal from "../components/shared/CMSModal";
import CMSConfirmDialog from "../components/shared/CMSConfirmDialog";

// ====================================================================
// MEDIA MANAGER - Manage images and media files
// ====================================================================

const MediaManager = () => {
  const { mediaLibrary, addMedia, updateMedia, deleteMedia } = useCMS();
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  
  const [newMedia, setNewMedia] = useState({
    name: "",
    url: "",
    type: "image"
  });

  // Filter media by search
  const filteredMedia = mediaLibrary.filter(media =>
    media.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    media.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddMedia = () => {
    if (!newMedia.name.trim() || !newMedia.url.trim()) return;
    addMedia(newMedia);
    setShowAddModal(false);
    setNewMedia({ name: "", url: "", type: "image" });
  };

  const handleDeleteMedia = () => {
    if (selectedMedia) {
      deleteMedia(selectedMedia.id);
      setSelectedMedia(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/cms"
            className="p-2 rounded-lg bg-[#212631] border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-slate-100"
            >
              Media Manager
            </motion.h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage all your images and media files
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Media
        </button>
      </div>

      {/* Toolbar */}
      <CMSCard noPadding>
        <div className="flex items-center justify-between p-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-[#1b2029] px-3 py-2 rounded-lg border border-slate-700/50 focus-within:border-[#204ecf]/50 transition-colors w-64">
            <Search size={14} className="text-slate-500" />
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600 text-slate-200"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#1b2029] p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-[#204ecf] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-[#204ecf] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </CMSCard>

      {/* Media Stats */}
      <div className="grid grid-cols-3 gap-4">
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{mediaLibrary.length}</p>
            <p className="text-xs text-slate-500">Total Files</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">
              {mediaLibrary.filter(m => m.type === "image").length}
            </p>
            <p className="text-xs text-slate-500">Images</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">
              {new Set(mediaLibrary.flatMap(m => m.usedIn || [])).size}
            </p>
            <p className="text-xs text-slate-500">Pages Using Media</p>
          </div>
        </CMSCard>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <CMSCard>
          <div className="py-12 text-center">
            <Image size={40} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {searchQuery ? "No media found" : "No media yet"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Add your first media file to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Media
              </button>
            )}
          </div>
        </CMSCard>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence>
            {filteredMedia.map((media, index) => (
              <motion.div
                key={media.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.03 }}
                className="group relative bg-[#212631] rounded-lg border border-slate-700/50 overflow-hidden aspect-square hover:border-[#204ecf]/50 transition-colors"
              >
                <div className="w-full h-full flex items-center justify-center bg-[#1b2029]">
                  <Image size={32} className="text-slate-700" />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-medium text-white truncate">{media.name}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => handleCopyUrl(media.url, media.id)}
                        className="p-1.5 bg-slate-800/80 rounded text-white hover:bg-slate-700 transition-colors"
                        title="Copy URL"
                      >
                        {copiedId === media.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => window.open(media.url, "_blank")}
                        className="p-1.5 bg-slate-800/80 rounded text-white hover:bg-slate-700 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMedia(media);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 bg-red-500/80 rounded text-white hover:bg-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <CMSCard noPadding>
          <div className="divide-y divide-slate-700/50">
            {filteredMedia.map((media) => (
              <div
                key={media.id}
                className="flex items-center justify-between p-4 hover:bg-[#1b2029] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1b2029] rounded-lg flex items-center justify-center border border-slate-700/50">
                    <Image size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{media.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{media.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 px-2 py-1 bg-slate-700/30 rounded">
                    {media.usedIn?.length || 0} pages
                  </span>
                  <button
                    onClick={() => handleCopyUrl(media.url, media.id)}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    {copiedId === media.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMedia(media);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CMSCard>
      )}

      {/* Add Media Modal */}
      <CMSModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Media"
        subtitle="Add an image URL to the media library"
        footer={
          <>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMedia}
              disabled={!newMedia.name.trim() || !newMedia.url.trim()}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                newMedia.name.trim() && newMedia.url.trim()
                  ? "text-white bg-[#204ecf] hover:bg-[#1a3db3]"
                  : "text-slate-500 bg-slate-700/30 cursor-not-allowed"
              }`}
            >
              Add Media
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={newMedia.name}
              onChange={(e) => setNewMedia({ ...newMedia, name: e.target.value })}
              placeholder="e.g., Hero Background Image"
              className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Image URL</label>
            <input
              type="text"
              value={newMedia.url}
              onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
              placeholder="/images/example.jpg or https://..."
              className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
            />
          </div>

          {newMedia.url && (
            <div className="p-4 bg-[#1b2029] rounded-lg border border-slate-700/50">
              <label className="text-xs font-medium text-slate-500 mb-2 block">Preview</label>
              <div className="aspect-video bg-[#151b23] rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={newMedia.url}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div className="hidden items-center justify-center text-slate-500">
                  <Image size={24} />
                </div>
              </div>
            </div>
          )}
        </div>
      </CMSModal>

      {/* Delete Confirmation */}
      <CMSConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedMedia(null);
        }}
        onConfirm={handleDeleteMedia}
        title="Delete Media"
        message={`Are you sure you want to delete "${selectedMedia?.name}"? This may affect pages using this image.`}
      />
    </div>
  );
};

export default MediaManager;
