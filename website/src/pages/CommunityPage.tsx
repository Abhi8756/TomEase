import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ThumbsUp, Send, User, Clock, Image as ImageIcon } from 'lucide-react';
import { communityApi, API_BASE } from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityPage() {
  const location = useLocation();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scanId, setScanId] = useState<string | undefined>(undefined);
  const [activePost, setActivePost] = useState<number | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    if (location.state?.prefill) {
      setShowNewPost(true);
      setContent(location.state.prefill);
      setTitle('Need advice on this scan');
      if (location.state.scan_id) {
        setScanId(location.state.scan_id);
      }
    }
  }, [location.state]);

  const fetchPosts = async () => {
    try {
      const res = await communityApi.getPosts();
      setPosts(res.data);
    } catch (e) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      await communityApi.createPost({ title, content, scan_id: scanId });
      toast.success('Posted successfully');
      setShowNewPost(false);
      setTitle('');
      setContent('');
      setScanId(undefined);
      fetchPosts();
    } catch (e) {
      toast.error('Failed to post');
    }
  };

  const handleUpvote = async (id: number) => {
    try {
      const res = await communityApi.upvotePost(id);
      setPosts(posts.map(p => p.id === id ? { ...p, upvotes: res.data.upvotes, is_upvoted: res.data.is_upvoted } : p));
    } catch (e) {
      toast.error('Error updating upvote');
    }
  };

  const loadComments = async (id: number) => {
    if (activePost === id) {
      setActivePost(null);
      return;
    }
    setActivePost(id);
    try {
      const res = await communityApi.getComments(id);
      setComments(res.data);
    } catch (e) {
      toast.error('Failed to load comments');
    }
  };

  const handleCreateComment = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await communityApi.createComment(postId, newComment);
      setNewComment('');
      loadComments(postId);
      setPosts(posts.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
    } catch (e) {
      toast.error('Failed to comment');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Community Forum</h1>
          <p className="text-gray-400">Discuss findings, share scans, and ask experts.</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors"
        >
          New Post
        </button>
      </div>

      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 rounded-2xl mb-8"
          >
            <form onSubmit={handleCreatePost}>
              <input
                type="text"
                placeholder="Post title"
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:ring-2 focus:ring-primary-500 outline-none"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea
                placeholder="What's on your mind?"
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 min-h-[100px] focus:ring-2 focus:ring-primary-500 outline-none"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              
              {scanId && (
                <div className="mb-4 bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-primary-300 font-medium">Scan Attached</p>
                    <p className="text-xs text-primary-400/70">The scan from your latest result will be visible to the community.</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewPost(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2">
                  <Send className="w-4 h-4" /> Post
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 glass rounded-2xl">No posts yet. Be the first to start a discussion!</div>
        ) : (
          posts.map((post) => (
            <motion.div key={post.id} className="glass rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{post.author_name}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>

                {post.scan && (
                  <div className="mb-6 bg-dark-900/50 rounded-xl border border-white/5 p-4 flex gap-4 items-center">
                    <img onClick={() => setExpandedImage(API_BASE + post.scan.image_url)} src={API_BASE + post.scan.image_url} alt="Scan" className="w-20 h-20 rounded-lg object-cover bg-dark-800 cursor-pointer hover:opacity-80 transition-opacity" />
                    <div>
                      <h4 className="text-white font-medium mb-1">Attached Scan</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          post.scan.disease === 'Healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {post.scan.disease.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">Confidence: {(post.scan.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6 border-t border-white/5 pt-4">
                  <button onClick={() => handleUpvote(post.id)} className={`flex items-center gap-2 transition-colors group ${post.is_upvoted ? 'text-primary-400' : 'text-gray-400 hover:text-primary-400'}`}>
                    <div className="p-2 rounded-full group-hover:bg-primary-500/10">
                      <ThumbsUp className={`w-5 h-5 ${post.is_upvoted ? 'fill-primary-400' : ''}`} />
                    </div>
                    <span className="font-medium">{post.upvotes}</span>
                  </button>
                  <button onClick={() => loadComments(post.id)} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageSquare className="w-5 h-5" /></div>
                    <span className="font-medium">{post.comment_count}</span>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {activePost === post.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-dark-900/50 border-t border-white/5 overflow-hidden">
                    <div className="p-6">
                      <div className="space-y-4 mb-6">
                        {comments.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center">No comments yet.</p>
                        ) : (
                          comments.map(c => (
                            <div key={c.id} className="bg-dark-800 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm text-white">{c.author_name}</span>
                                <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                              </div>
                              <p className="text-gray-300 text-sm">{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <form onSubmit={(e) => handleCreateComment(e, post.id)} className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                        />
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-500">
                          Post
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
            onClick={() => setExpandedImage(null)}
          >
            <img src={expandedImage} alt="Expanded scan" className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
