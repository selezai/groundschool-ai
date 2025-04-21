import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Breakpoints for responsive design
const BREAKPOINTS = {
  SMALL: 576,   // Mobile
  MEDIUM: 768,  // Tablet
  LARGE: 992,   // Desktop
  XLARGE: 1200  // Large desktop
};

// Device types
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

// Hook to get current device type and window dimensions
export const useResponsive = () => {
  const [windowDimensions, setWindowDimensions] = useState(
    Dimensions.get('window')
  );
  
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions(Dimensions.get('window'));
    };
    
    // Only add event listener on web
    if (Platform.OS === 'web') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    
    // For mobile, use Dimensions change event
    const subscription = Dimensions.addEventListener('change', handleResize);
    return () => subscription.remove();
  }, []);
  
  // Determine device type based on width
  const { width } = windowDimensions;
  let deviceType = DEVICE_TYPES.MOBILE;
  
  if (width >= BREAKPOINTS.LARGE) {
    deviceType = DEVICE_TYPES.DESKTOP;
  } else if (width >= BREAKPOINTS.MEDIUM) {
    deviceType = DEVICE_TYPES.TABLET;
  }
  
  return {
    width,
    height: windowDimensions.height,
    deviceType,
    isMobile: deviceType === DEVICE_TYPES.MOBILE,
    isTablet: deviceType === DEVICE_TYPES.TABLET,
    isDesktop: deviceType === DEVICE_TYPES.DESKTOP,
    isLandscape: width > windowDimensions.height
  };
};

// Responsive container component
const ResponsiveContainer = ({ children, style, ...props }) => {
  const { deviceType, width } = useResponsive();
  const { colors } = useTheme();
  
  // Determine max width based on device type
  let maxWidth = '100%';
  let padding = 16;
  
  if (deviceType === DEVICE_TYPES.DESKTOP) {
    maxWidth = Math.min(1140, width - 48);
    padding = 24;
  } else if (deviceType === DEVICE_TYPES.TABLET) {
    maxWidth = Math.min(720, width - 32);
    padding = 20;
  }
  
  const styles = StyleSheet.create({
    container: {
      width: '100%',
      maxWidth,
      marginHorizontal: 'auto',
      paddingHorizontal: padding,
      backgroundColor: colors.background
    }
  });
  
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
};

// Responsive grid component
const ResponsiveGrid = ({ 
  children, 
  columns = { 
    small: 1, 
    medium: 2, 
    large: 3, 
    xlarge: 4 
  }, 
  spacing = 16,
  style,
  ...props 
}) => {
  const { _width } = useResponsive();
  const { _colors } = useTheme();
  
  // Determine number of columns based on screen width
  let numColumns = columns.small;
  
  if (_width >= BREAKPOINTS.XLARGE) {
    numColumns = columns.xlarge;
  } else if (_width >= BREAKPOINTS.LARGE) {
    numColumns = columns.large;
  } else if (_width >= BREAKPOINTS.MEDIUM) {
    numColumns = columns.medium;
  }
  
  // Create rows and columns from children
  const rows = [];
  const childrenArray = React.Children.toArray(children);
  
  for (let i = 0; i < childrenArray.length; i += numColumns) {
    rows.push(childrenArray.slice(i, i + numColumns));
  }
  
  const styles = StyleSheet.create({
    grid: {
      width: '100%'
    },
    row: {
      flexDirection: 'row',
      marginHorizontal: -spacing / 2,
      marginBottom: spacing
    },
    column: {
      flex: 1,
      paddingHorizontal: spacing / 2
    }
  });
  
  return (
    <View style={[styles.grid, style]} {...props}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((col, colIndex) => (
            <View 
              key={`col-${rowIndex}-${colIndex}`} 
              style={[
                styles.column,
                // If there are fewer items in the last row, adjust their width
                row.length < numColumns && rowIndex === rows.length - 1 
                  ? { flex: numColumns / row.length } 
                  : {}
              ]}
            >
              {col}
            </View>
          ))}
          
          {/* Add empty columns if the last row is not complete */}
          {rowIndex === rows.length - 1 && row.length < numColumns && 
            Array(numColumns - row.length).fill().map((_, i) => (
              <View 
                key={`empty-${rowIndex}-${i}`} 
                style={styles.column} 
              />
            ))
          }
        </View>
      ))}
    </View>
  );
};

// Responsive sidebar layout
const ResponsiveSidebarLayout = ({ 
  sidebar, 
  content,
  sidebarWidth = 280,
  sidebarPosition = 'left',
  collapsible = true,
  style,
  ...props 
}) => {
  const { deviceType } = useResponsive();
  const [sidebarVisible, setSidebarVisible] = useState(deviceType !== DEVICE_TYPES.MOBILE);
  const { _colors } = useTheme();
  
  // Update sidebar visibility when device type changes
  useEffect(() => {
    if (collapsible) {
      setSidebarVisible(deviceType !== DEVICE_TYPES.MOBILE);
    } else {
      setSidebarVisible(true);
    }
  }, [deviceType, collapsible]);
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: deviceType === DEVICE_TYPES.MOBILE ? 'column' : 'row',
      width: '100%',
      height: '100%'
    },
    sidebar: {
      width: deviceType === DEVICE_TYPES.MOBILE ? '100%' : sidebarWidth,
      backgroundColor: _colors.card,
      borderRightWidth: sidebarPosition === 'left' && deviceType !== DEVICE_TYPES.MOBILE ? 1 : 0,
      borderLeftWidth: sidebarPosition === 'right' && deviceType !== DEVICE_TYPES.MOBILE ? 1 : 0,
      borderColor: _colors.border,
      display: sidebarVisible ? 'flex' : 'none'
    },
    content: {
      flex: 1,
      backgroundColor: _colors.background
    },
    toggleButton: {
      position: 'absolute',
      top: 10,
      [sidebarPosition]: 10,
      zIndex: 1000
    }
  });
  
  // Toggle sidebar visibility
  const _toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };
  
  return (
    <View style={[styles.container, style]} {...props}>
      {sidebarPosition === 'left' && (
        <View style={styles.sidebar}>
          {sidebar}
        </View>
      )}
      
      <View style={styles.content}>
        {collapsible && deviceType === DEVICE_TYPES.MOBILE && (
          <View style={styles.toggleButton}>
            {/* You can add a toggle button component here */}
          </View>
        )}
        {content}
      </View>
      
      {sidebarPosition === 'right' && (
        <View style={styles.sidebar}>
          {sidebar}
        </View>
      )}
    </View>
  );
};

export {
  BREAKPOINTS,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveSidebarLayout
};
