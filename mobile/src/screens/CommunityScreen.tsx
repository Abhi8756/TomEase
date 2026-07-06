import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { ThumbsUp, MessageSquare } from 'lucide-react-native';
import api from '../services/api';
import { useStore } from '../store';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityScreen() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const user = useStore((state) => state.user);

  useEffect(() => {
    fetchPosts();
  }, []);

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

  const handleUpvote = async (postId: number) => {
    try {
      // Optimistic update
      setPosts(current => current.map(p => 
        p.id === postId 
          ? { ...p, upvotes: p.has_upvoted ? p.upvotes - 1 : p.upvotes + 1, has_upvoted: !p.has_upvoted }
          : p
      ));
      await api.post(`/community/posts/${postId}/upvote`);
    } catch (error) {
      // Revert on failure
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
      await api.post('/community/posts', {
        title: newTitle,
        content: newContent
      });
      setNewTitle('');
      setNewContent('');
      fetchPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>{item.content}</Text>
      
      <View style={styles.postFooter}>
        <Text style={styles.authorText}>
          {item.user_name} • {formatDistanceToNow(new Date(item.created_at))} ago
        </Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleUpvote(item.id)}>
            <ThumbsUp size={16} color={item.has_upvoted ? '#10b981' : '#9ca3af'} />
            <Text style={[styles.actionText, item.has_upvoted && { color: '#10b981' }]}>
              {item.upvotes}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.createPostContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask the community a question..."
          placeholderTextColor="#9ca3af"
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
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
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  createPostContainer: {
    padding: 15,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  input: {
    backgroundColor: '#374151',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  postButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  postCard: {
    backgroundColor: '#1f2937',
    margin: 10,
    marginBottom: 0,
    padding: 15,
    borderRadius: 8,
  },
  postTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  postContent: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 15,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 10,
  },
  authorText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  actionText: {
    color: '#9ca3af',
    marginLeft: 5,
    fontSize: 14,
  }
});
