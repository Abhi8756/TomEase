import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { ThumbsUp, MessageSquare, X, Send } from 'lucide-react-native';
import api from '../services/api';
import { useStore } from '../store';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const user = useStore((state) => state.user);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/community/posts');
      setPosts(res.data);
    } catch (error) {
      console.error('Failed to fetch posts', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: number) => {
    setCommentsLoading(true);
    try {
      const res = await api.get(`/community/posts/${postId}/comments`);
      setComments(res.data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openPost = (post: any) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  const handleUpvote = async (postId: number) => {
    try {
      setPosts(current => current.map(p =>
        p.id === postId
          ? { ...p, upvotes: p.has_upvoted ? p.upvotes - 1 : p.upvotes + 1, has_upvoted: !p.has_upvoted }
          : p
      ));
      await api.post(`/community/posts/${postId}/upvote`);
    } catch {
      fetchPosts();
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }
    setIsPosting(true);
    try {
      await api.post('/community/posts', { title: newTitle, content: newContent });
      setNewTitle('');
      setNewContent('');
      fetchPosts();
    } catch {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      await api.post(`/community/posts/${selectedPost.id}/comments`, { content: newComment });
      setNewComment('');
      fetchComments(selectedPost.id);
    } catch {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.postCard} onPress={() => openPost(item)}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
      <View style={styles.postFooter}>
        <Text style={styles.authorText}>
          {item.user_name} · {formatDistanceToNow(new Date(item.created_at))} ago
        </Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => { e.stopPropagation?.(); handleUpvote(item.id); }}
          >
            <ThumbsUp size={15} color={item.has_upvoted ? '#10b981' : '#9ca3af'} />
            <Text style={[styles.actionText, item.has_upvoted && { color: '#10b981' }]}>
              {item.upvotes}
            </Text>
          </TouchableOpacity>
          <View style={styles.actionButton}>
            <MessageSquare size={15} color="#9ca3af" />
            <Text style={styles.actionText}>{item.comment_count ?? 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Create Post */}
      <View style={styles.createPostContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask the community a question..."
          placeholderTextColor="#9ca3af"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Provide more details..."
          placeholderTextColor="#9ca3af"
          multiline
          value={newContent}
          onChangeText={setNewContent}
        />
        <TouchableOpacity style={styles.postButton} onPress={handleCreatePost} disabled={isPosting}>
          {isPosting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Post</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={loading}
          onRefresh={fetchPosts}
        />
      )}

      {/* Post Detail + Comments Modal */}
      <Modal visible={!!selectedPost} animationType="slide" onRequestClose={() => setSelectedPost(null)}>
        {selectedPost && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedPost.title}</Text>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <X size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }}>
                {/* Post content */}
                <View style={styles.modalPostBody}>
                  <Text style={styles.modalPostContent}>{selectedPost.content}</Text>
                  <Text style={styles.modalMeta}>
                    {selectedPost.user_name} · {formatDistanceToNow(new Date(selectedPost.created_at))} ago
                  </Text>
                  <TouchableOpacity style={styles.upvoteRow} onPress={() => handleUpvote(selectedPost.id)}>
                    <ThumbsUp size={16} color={selectedPost.has_upvoted ? '#10b981' : '#9ca3af'} />
                    <Text style={[styles.actionText, selectedPost.has_upvoted && { color: '#10b981' }]}>
                      {selectedPost.upvotes} upvotes
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Comments */}
                <Text style={styles.commentsLabel}>Comments</Text>
                {commentsLoading ? (
                  <ActivityIndicator color="#10b981" style={{ margin: 20 }} />
                ) : comments.length === 0 ? (
                  <Text style={styles.noComments}>No comments yet. Be the first!</Text>
                ) : (
                  comments.map((c) => (
                    <View key={c.id} style={styles.commentCard}>
                      <Text style={styles.commentUser}>{c.user_name}</Text>
                      <Text style={styles.commentContent}>{c.content}</Text>
                      <Text style={styles.commentTime}>
                        {formatDistanceToNow(new Date(c.created_at))} ago
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Comment input */}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor="#9ca3af"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleAddComment}>
                  <Send size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  createPostContainer: {
    padding: 15, backgroundColor: '#1f2937',
    borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  input: {
    backgroundColor: '#374151', color: '#fff',
    borderRadius: 8, padding: 12, marginBottom: 10,
  },
  postButton: {
    backgroundColor: '#10b981', padding: 12,
    borderRadius: 8, alignItems: 'center',
  },
  postButtonText: { color: '#fff', fontWeight: 'bold' },
  postCard: {
    backgroundColor: '#1f2937', margin: 10,
    marginBottom: 0, padding: 15, borderRadius: 8,
  },
  postTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  postContent: { color: '#d1d5db', fontSize: 14, marginBottom: 12 },
  postFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderTopWidth: 1,
    borderTopColor: '#374151', paddingTop: 10,
  },
  authorText: { color: '#9ca3af', fontSize: 12, flex: 1 },
  actionRow: { flexDirection: 'row' },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  actionText: { color: '#9ca3af', marginLeft: 4, fontSize: 13 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#111827' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16,
    backgroundColor: '#1f2937', borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 12 },
  modalPostBody: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalPostContent: { color: '#d1d5db', fontSize: 15, lineHeight: 22 },
  modalMeta: { color: '#9ca3af', fontSize: 12, marginTop: 12 },
  upvoteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  commentsLabel: {
    color: '#10b981', fontWeight: 'bold', fontSize: 15,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  noComments: { color: '#6b7280', textAlign: 'center', marginTop: 20 },
  commentCard: {
    backgroundColor: '#1f2937', marginHorizontal: 12,
    marginBottom: 8, padding: 12, borderRadius: 8,
  },
  commentUser: { color: '#10b981', fontWeight: 'bold', fontSize: 13 },
  commentContent: { color: '#d1d5db', fontSize: 14, marginTop: 4 },
  commentTime: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderTopWidth: 1, borderTopColor: '#374151',
    backgroundColor: '#1f2937',
  },
  commentInput: {
    flex: 1, backgroundColor: '#374151', color: '#fff',
    borderRadius: 8, padding: 10, maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#10b981', padding: 12,
    borderRadius: 8, marginLeft: 10,
  },
});
