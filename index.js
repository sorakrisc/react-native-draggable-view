import React, {Component} from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import PropTypes from 'prop-types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

class DraggableView extends Component {
  constructor(props) {
    super(props);
    const initialUsedSpace = Math.abs(this.props.initialDrawerSize);
    const initialDrawerSize = SCREEN_HEIGHT * (1 - initialUsedSpace);

    this.state = {
      touched: false,
      position: new Animated.Value(initialDrawerSize),
      fadeValue: new Animated.Value(1),
      initialPosition: initialDrawerSize,
      finalPosition: this.props.finalDrawerHeight,
      initialUsedSpace: initialUsedSpace,
      resetFlag: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    const {
      autoDrawerUp,
    } = this.props;

    const autoDrawerUpSuccess = (autoDrawerUp !== nextProps.autoDrawerUp) &&
        (nextProps.autoDrawerUp === 1);

    if (autoDrawerUpSuccess) {
      setTimeout(() => {
        this.moveFinishedUpper();
      }, 1000);
    }
  }

  open() {
    this.startAnimation(-100, 500, this.state.initialPosition, null,
        this.state.finalPosition);
    this.props.onRelease && this.props.onRelease(true); // only add this line if you need to detect if the drawer is up or not
  }

  close = () => {
    // console.log('closee');

    this.startAnimation(-90, 100, this.state.finalPosition, null,
        this.state.initialPosition, true);
    this.props.onRelease && this.props.onRelease(true); // only add this line if you need to detect if the drawer is up or not

  };

  reset = () => {
    this.setState({resetFlag: true}, () => {
      this.close();
    });
  };

  isAValidMovement = (distanceX, distanceY) => {
    const moveTravelledFarEnough =
        Math.abs(distanceY) > Math.abs(distanceX) && Math.abs(distanceY) > 2;
    return moveTravelledFarEnough;
  };

  startAnimation = (
      velocityY,
      positionY,
      initialPosition,
      id,
      finalPosition,
      force,
  ) => {
    // console.log('start animation');
    const {isInverseDirection} = this.props;

    var isGoingToUp = velocityY < 0 ? !isInverseDirection : isInverseDirection;
    var endPosition = isGoingToUp ? finalPosition + 50 : initialPosition + 50;

    var position = new Animated.Value(positionY);
    position.removeAllListeners();

    Animated.timing(position, {
      toValue: endPosition,
      tension: 30,
      friction: 0,
      velocity: velocityY,
    }).start();

    position.addListener(pos => {
      if (!this.center) {
        return;
      }
      if (this.state.resetFlag && !force) {
        position.removeAllListeners();
        return;
      }
      this.onUpdatePosition(pos.value);
    });
  };

  onUpdatePosition(position) {
    position = position - 50;
    // console.log('position', position);
    this.state.position.setValue(position);
    if (this.props.fade) {
      // console.log('', Math.min(position / this.state.initialPosition, 1));
      this.state.fadeValue.setValue(
          Math.min(position / this.state.initialPosition, 1));
    }
    this._previousTop = position;
    const {initialPosition} = this.state;

    if (initialPosition === position) {
      this.props.onInitialPositionReached();
    }
  }

  componentWillMount() {
    this._panGesture = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
            this.isAValidMovement(gestureState.dx, gestureState.dy) &&
            this.state.touched
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        this.moveDrawerView(gestureState);
      },
      onPanResponderRelease: (evt, gestureState) => {
        this.moveFinished(gestureState);
      },
    });
  }

  moveDrawerView(gestureState) {
    if (!this.center) {
      return;
    }
    const position = gestureState.moveY - SCREEN_HEIGHT * 0.05;
    this.onUpdatePosition(position);
  }

  moveFinished(gestureState) {
    const isGoingToUp = gestureState.vy < 0;
    if (!this.center) {
      return;
    }
    this.startAnimation(
        gestureState.vy,
        gestureState.moveY,
        this.state.initialPosition,
        gestureState.stateId,
        this.state.finalPosition,
    );
    this.props.onRelease(isGoingToUp, () => {
      this.reset();
    });
  }

  moveFinishedUpper() {
    if (!this.center) {
      return;
    }
    this.startAnimation(-10, 0, this.state.initialPosition, 0,
        this.state.finalPosition);
    this.props.onRelease && this.props.onRelease(true);
  }

  render() {
    const containerView = this.props.renderContainerView();
    const drawerView = this.props.renderDrawerView();
    const initDrawerView = this.props.renderInitDrawerView();

    const drawerPosition = {
      top: this.state.position,
      opacity: this.state.fadeValue,
    };
    return (
        <View style={styles.viewport}>
          <View style={styles.container}>{containerView}</View>
          <Animated.View
              style={[
                drawerPosition,
                styles.drawer,
                {
                  backgroundColor: this.props.drawerBg,
                },
              ]}
              ref={center => (this.center = center)}
              {...this._panGesture.panHandlers}
          >
            {initDrawerView
                ? (
                    <TouchableWithoutFeedback
                        onPressIn={() => this.setState({touched: true})}
                        onPressOut={() => this.setState({touched: false})}
                    >
                      {initDrawerView}
                    </TouchableWithoutFeedback>
                )
                : null
            }
            {drawerView}
          </Animated.View>
        </View>
    );
  }
}

var styles = StyleSheet.create({
  viewport: {
    flex: 1,
  },
  drawer: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});

DraggableView.propTypes = {
  drawerBg: PropTypes.string,
  finalDrawerHeight: PropTypes.number,
  isInverseDirection: PropTypes.bool,
  onInitialPositionReached: PropTypes.func,
  onRelease: PropTypes.func,
  renderContainerView: PropTypes.func,
  renderDrawerView: PropTypes.func,
  renderInitDrawerView: PropTypes.func,
  fade: PropTypes.bool,
};

DraggableView.defaultProps = {
  drawerBg: 'white',
  finalDrawerHeight: 0,
  isInverseDirection: false,
  onInitialPositionReached: () => {
  },
  onRelease: () => {
  },
  renderContainerView: () => {
  },
  renderDrawerView: () => {
  },
  renderInitDrawerView: () => {
  },
  fade: false,
};

export default DraggableView;
