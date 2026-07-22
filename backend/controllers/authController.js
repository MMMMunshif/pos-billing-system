export async function getCurrentUser(req, res) {
  res.json({ success: true, data: { uid: req.user.uid, email: req.user.email, profile: req.userProfile } });
}
