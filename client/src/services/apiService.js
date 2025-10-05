const API_BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

class ApiService {
  // Create (or reset) the single poll
  async createPoll() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to create poll");
      return await response.json(); // { teacherId, roomKey, teacherKey? }
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  }

  // Get current poll state
  async getPoll() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/poll`, { method: "GET" });
      if (!response.ok) throw new Error("Poll not found");
      return await response.json();
    } catch (error) {
      console.error("Error fetching poll:", error);
      throw error;
    }
  }

  // Student join (requires secretKey)
  async joinPoll(name, tabId, secretKey) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/poll/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tabId, secretKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to join poll");
      return data; // { studentId }
    } catch (error) {
      console.error("Error joining poll:", error);
      throw error;
    }
  }
 async checkBan(tabId) {
    const url = `${API_BASE_URL}/api/poll/ban/check?tabId=${encodeURIComponent(tabId)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Ban check failed");
    return data; // { banned: boolean, bannedUntil: number|null }
  }
  // Teacher adds a question (requires teacherId)
  async addQuestion(question, options,timerSec) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/poll/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options ,timerSec}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to add question");
      return data; // { questionId }
    } catch (error) {
      console.error("Error adding question:", error);
      throw error;
    }
  }
}

export default new ApiService();
