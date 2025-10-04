const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';

class ApiService {
  async createPoll() {
    try {
      const response = await fetch(`${API_BASE_URL}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create poll');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  }

  async getPoll(pollId) {
    try {
      const response = await fetch(`${API_BASE_URL}/polls/${pollId}`);
      
      if (!response.ok) {
        throw new Error('Poll not found');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching poll:', error);
      throw error;
    }
  }

  async joinPoll(pollId, name, tabId) {
    try {
      const response = await fetch(`${API_BASE_URL}/polls/${pollId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, tabId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join poll');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error joining poll:', error);
      throw error;
    }
  }

  async addQuestion(pollId, question, options, teacherId) {
    try {
      const response = await fetch(`${API_BASE_URL}/polls/${pollId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question, options, teacherId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add question');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding question:', error);
      throw error;
    }
  }
}

export default new ApiService();
