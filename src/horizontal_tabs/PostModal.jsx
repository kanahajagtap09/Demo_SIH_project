import React from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { FaHeart, FaComment, FaPaperPlane, FaBookmark } from "react-icons/fa";

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
  p: 2,
  width: { xs: '95vw', sm: 400 },
  maxHeight: '90vh',
  outline: 'none',
};

export default function PostModal({ open, handleClose, post }) {
  if (!post) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar src={post.user?.photoURL} alt={post.user?.username} />
          <Typography sx={{ ml: 2, fontWeight: 600 }}>{post.user?.username}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={handleClose}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ mb: 2 }}>
          <img
            src={post.image}
            alt="Post"
            style={{ width: "100%", borderRadius: 8, maxHeight: 350, objectFit: "cover" }}
          />
        </Box>
        <Typography sx={{ mb: 1 }}>
          <strong>{post.user?.username}</strong> {post.text}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <FaHeart />
          <FaComment />
          <FaPaperPlane />
          <FaBookmark />
        </Box>
        {post.tags?.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 12,
                  background: "#e3f2fd",
                  color: "#1976d2",
                  padding: "2px 8px",
                  borderRadius: 12,
                }}
              >
                #{tag}
              </span>
            ))}
          </Box>
        )}
      </Box>
    </Modal>
  );
}