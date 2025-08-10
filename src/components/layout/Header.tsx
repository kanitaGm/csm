import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Brightness7 as Brightness7Icon,
  Brightness4 as Brightness4Icon,
} from '@mui/icons-material';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutAnchorEl, setAboutAnchorEl] = useState<null | HTMLElement>(null);
  const [contactAnchorEl, setContactAnchorEl] = useState<null | HTMLElement>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode and apply class to html root
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // About menu handlers
  const handleAboutClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAboutAnchorEl(event.currentTarget);
  };
  const handleAboutClose = () => {
    setAboutAnchorEl(null);
  };

  // Contact menu handlers
  const handleContactClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setContactAnchorEl(event.currentTarget);
  };
  const handleContactClose = () => {
    setContactAnchorEl(null);
  };

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setAboutAnchorEl(null);
    setContactAnchorEl(null);
  };

  return (
    <AppBar position="fixed" color={darkMode ? 'default' : 'primary'} sx={{ bgcolor: darkMode ? '#1f2a33' : '#e9f5e1', color: darkMode ? '#fff' : '#2e4a31' }}>
      <Toolbar sx={{ minHeight: { xs: '38px', md: '38px' }, display: 'flex', justifyContent: 'space-between' }}> {/* Adjusted minHeight */}
        {/* Logo */}
        <Box display="flex" alignItems="center" gap={1}>
          {/* ใช้ไอคอน MUI หรือจะใช้รูปโลโก้ได้ */}
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Safety Passport
          </Typography>
        </Box>

        {/* Desktop Menu */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            onClick={handleAboutClick}
            endIcon={<ExpandMoreIcon fontSize="small" />}
          >
            About
          </Button>
          <Menu
            anchorEl={aboutAnchorEl}
            open={Boolean(aboutAnchorEl)}
            onClose={handleAboutClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <MenuItem onClick={handleAboutClose}>Our Story</MenuItem>
            <MenuItem onClick={handleAboutClose}>Team</MenuItem>
          </Menu>

          <Button color="inherit">Services</Button>
          <Button color="inherit">Projects</Button>

          <Button
            color="inherit"
            onClick={handleContactClick}
            endIcon={<ExpandMoreIcon fontSize="small" />}
          >
            Contact
          </Button>
          <Menu
            anchorEl={contactAnchorEl}
            open={Boolean(contactAnchorEl)}
            onClose={handleContactClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <MenuItem onClick={handleContactClose}>Email</MenuItem>
            <MenuItem onClick={handleContactClose}>Location</MenuItem>
          </Menu>

          {/* Dark mode toggle */}
          <IconButton
            onClick={toggleDarkMode}
            color="inherit"
            aria-label="Toggle dark mode"
            sx={{ ml: 1 }}
          >
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>

        {/* Mobile Menu Button */}
        <IconButton
          edge="end"
          color="inherit"
          aria-label="menu"
          onClick={toggleMobileMenu}
          sx={{ display: { md: 'none' } }}
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            bgcolor: darkMode ? '#1f2a23' : '#e9f5e',
            color: darkMode ? '#fff' : '#2e4a34',
            px: 2,
            pb: 2,
          }}
        >
          <Button fullWidth onClick={handleAboutClick} endIcon={<ExpandMoreIcon />}>
            About
          </Button>
          <Menu
            anchorEl={aboutAnchorEl}
            open={Boolean(aboutAnchorEl)}
            onClose={handleAboutClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <MenuItem onClick={handleAboutClose}>Our Story</MenuItem>
            <MenuItem onClick={handleAboutClose}>Team</MenuItem>
          </Menu>

          <Button fullWidth>Services</Button>
          <Button fullWidth>Projects</Button>

          <Button fullWidth onClick={handleContactClick} endIcon={<ExpandMoreIcon />}>
            Contact
          </Button>
          <Menu
            anchorEl={contactAnchorEl}
            open={Boolean(contactAnchorEl)}
            onClose={handleContactClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <MenuItem onClick={handleContactClose}>Email</MenuItem>
            <MenuItem onClick={handleContactClose}>Location</MenuItem>
          </Menu>

          {/* Dark mode toggle */}
          <Button
            fullWidth
            onClick={toggleDarkMode}
            startIcon={darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            sx={{ mt: 2, justifyContent: 'flex-start' }}
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </Box>
      )}
    </AppBar>
  );
};

export default Header;