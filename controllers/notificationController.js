const { getState, save } = require('../data/store');

// Get user notifications
const getNotifications = async (req, res) => {
  try {
    const { isRead, page = 1, limit = 20 } = req.query;
    const state = await getState();
    const filtered = state.notifications
      .filter((item) => item.user_id === req.user.id)
      .filter((item) => isRead === undefined || item.is_read === (isRead === 'true'))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const start = (Number(page) - 1) * Number(limit);
    const notifications = filtered.slice(start, start + Number(limit));
    const unreadCount = state.notifications.filter((item) => item.user_id === req.user.id && !item.is_read).length;

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await getState();
    const notification = state.notifications.find((item) => item.id === Number(id) && item.user_id === req.user.id);
    if (notification) {
      notification.is_read = true;
      await save(state);
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const state = await getState();
    state.notifications.forEach((item) => {
      if (item.user_id === req.user.id) item.is_read = true;
    });
    await save(state);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const state = await getState();
    state.notifications = state.notifications.filter((item) => !(item.id === Number(id) && item.user_id === req.user.id));
    await save(state);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Delete all read notifications
const deleteReadNotifications = async (req, res) => {
  try {
    const state = await getState();
    state.notifications = state.notifications.filter((item) => !(item.user_id === req.user.id && item.is_read));
    await save(state);

    res.json({
      success: true,
      message: 'All read notifications deleted'
    });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications
};
