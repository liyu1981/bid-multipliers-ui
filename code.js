const initState = {
  adSetId: '',
  accessToken: '',
  settings: {},
};

function updateSettings(lastSettings, parentPath, newPath, value) {
  // console.log('udpateSettings:', lastSettings, parentPath, newPath, value);
  const newSettings = JSON.parse(JSON.stringify(lastSettings));
  if (parentPath.length <= 0) {
    newSettings[newPath] = value;
  } else {
    const parentPaths = parentPath.split('.');
    let p = newSettings;
    let i = 0;
    for (; i < parentPaths.length - 1; i = i + 1) {
      parentPaths[i].length <= 0 ? null : (p = p[parentPaths[i]]);
    }
    const lastPath = parentPaths[i];
    if (typeof p[lastPath] !== 'object') {
      p[lastPath] = { [newPath]: value };
    } else {
      p[lastPath][newPath] = value;
    }
  }
  console.log('return new settings:', newSettings);
  return newSettings;
}

function getCurrentValue(lastSettings, currentPath) {
  // console.log('getCurrentValue:', currentPath);
  const paths = currentPath.split('.');
  let p = lastSettings;
  // console.log(lastSettings, currentPath, paths);
  paths.forEach((step) => (step.length <= 0 ? null : (p = p[step])));
  return p;
}

function replaceSettings(lastSettings, parentPath, oldKey, key, value) {
  // console.log('will replace:', parentPath, oldKey, key, value);
  const newSettings = JSON.parse(JSON.stringify(lastSettings));
  let p = newSettings;
  const parentPaths = parentPath.split('.');
  parentPaths.forEach((path) => (path.length <= 0 ? null : (p = p[path])));
  delete p[oldKey];
  p[key] = value;
  return newSettings;
}

function reducer(state, action) {
  switch (action.type) {
    case 'setAdSetId':
      return immer.produce(state, (draft) => {
        draft.adSetId = action.value;
      });
    case 'setAccessToken':
      return immer.produce(state, (draft) => {
        draft.accessToken = action.value;
      });
    case 'reset':
      return immer.produce(state, (draft) => {
        draft.settings = {};
      });
    case 'setValue':
      // console.log('will setValue:', action);
      return immer.produce(state, (draft) => {
        const pos = action.currentPath.lastIndexOf('.');
        const parentPath = action.currentPath.substring(0, pos);
        const newPath = action.currentPath.substring(pos + 1);
        draft.settings = updateSettings(draft.settings, parentPath, newPath, action.value);
      });
    case 'replaceValue':
      return immer.produce(state, (draft) => {
        draft.settings = replaceSettings(draft.settings, action.parentPath, action.oldKey, action.key, action.value);
      });
    case 'addCascade':
      return immer.produce(state, (draft) => {
        draft.settings = updateSettings(draft.settings, action.parentPath, action.newPath, action.value);
      });
    default:
      throw new Error('not implemented');
  }
}

function SetupUI({ state, dispatch, currentPath }) {
  const setting = getCurrentValue(state.settings, currentPath);

  const children = [];
  Object.keys(setting).forEach((key) => {
    switch (key) {
      case 'user_os':
        children.push(
          <UserOSControl
            key={key}
            state={state}
            dispatch={dispatch}
            config={{ title: 'Impression Device OS', currentPath: `${currentPath}.user_os` }}
          />
        );
        break;
      case 'gender':
        children.push(
          <GenderControl
            key={key}
            state={state}
            dispatch={dispatch}
            config={{ title: 'Gender', currentPath: `${currentPath}.gender` }}
          />
        );
        break;
      case 'age':
        children.push(
          <AgeControl
            key={key}
            state={state}
            dispatch={dispatch}
            config={{ title: 'Age', currentPath: `${currentPath}.age` }}
          />
        );
        break;
      case 'home_locations':
        children.push(
          <CountryControl
            key={key}
            state={state}
            dispatch={dispatch}
            config={{ title: 'User Locations', currentPath: `${currentPath}.home_locations.countries` }}
          />
        );
        break;
      case 'user_device':
        children.push(
          <UserDeviceControl
            key={key}
            state={state}
            dispatch={dispatch}
            config={{ title: 'User Device', currentPath: `${currentPath}.user_device` }}
          />
        );
        break;
    }
  });

  return <div>{children}</div>;
}

function SliderControl({ state, dispatch, config }) {
  const rangeRef = React.useRef(null);
  const currentValue = getCurrentValue(state.settings, config.currentPath) || 1;
  React.useEffect(() => {
    $(rangeRef.current).slider({
      range: false,
      min: 0.09,
      max: 1.0,
      step: 0.01,
      values: [1.0],
      slide: (event, ui) => {
        dispatch({
          type: 'setValue',
          currentPath: config.currentPath,
          value: ui.values[0],
        });
      },
    });
  }, [currentValue]);
  return (
    <div className="form-group">
      {typeof currentValue === 'object' ? (
        <div>
          <label>{config.title}</label>
          <SetupUI state={state} dispatch={dispatch} currentPath={config.currentPath}></SetupUI>
        </div>
      ) : (
        <div>
          <div>
            <label>{config.title}</label>
            <input type="text" id="android-input" readOnly={true} className="setup-slider-value" value={currentValue} />
          </div>
          <div ref={rangeRef}></div>
        </div>
      )}
    </div>
  );
}

function AgeSliderControl({ state, dispatch, config }) {
  const { from, to } = config;
  const rangeRef = React.useRef(null);
  const dispatchUpdate = (from, to, value) =>
    dispatch({
      type: 'setValue',
      currentPath: `${config.currentParentPath}.${from}-${to}`,
      value: value,
    });
  const dispatchReplace = (oldFrom, oldTo, from, to, value) =>
    dispatch({
      type: 'replaceValue',
      parentPath: config.currentParentPath,
      oldKey: `${oldFrom}-${oldTo}`,
      key: `${from}-${to}`,
      value: value,
    });
  const currentValue = getCurrentValue(state.settings, `${config.currentParentPath}.${from}-${to}`) || 1;
  React.useEffect(() => {
    $(rangeRef.current).slider({
      range: false,
      min: 0.09,
      max: 1.0,
      step: 0.01,
      values: [1.0],
      slide: (event, ui) => dispatchUpdate(from, to, ui.values[0]),
    });
  }, [currentValue]);
  const fromToLabel = (
    <span>
      <input type="number" value={from} onChange={(e) => dispatchReplace(from, to, e.target.value, to, currentValue)} />{' '}
      to{' '}
      <input type="number" value={to} onChange={(e) => dispatchReplace(from, to, from, e.target.value, currentValue)} />
      :
    </span>
  );
  return (
    <div className="form-group">
      {typeof currentValue === 'object' ? (
        <div>
          <div>{fromToLabel}</div>
          <SetupUI
            state={state}
            dispatch={dispatch}
            currentPath={`${config.currentParentPath}.${from}-${to}`}
          ></SetupUI>
        </div>
      ) : (
        <div>
          <div>
            {fromToLabel}
            <input type="text" readOnly={true} value={currentValue} className="setup-slider-value" />
          </div>
          <div ref={rangeRef}></div>
        </div>
      )}
    </div>
  );
}

function CountrySliderControl({ state, dispatch, config }) {
  const inputRef = React.useRef(null);
  const rangeRef = React.useRef(null);
  const dispatchUpdate = (countryKey, value) =>
    dispatch({
      type: 'setValue',
      currentPath: `${config.currentParentPath}.${countryKey}`,
      value: value,
    });
  const dispatchReplace = (oldCountryKey, countryKey, value) =>
    dispatch({
      type: 'replaceValue',
      parentPath: config.currentParentPath,
      oldKey: oldCountryKey,
      key: countryKey,
      value: value,
    });
  const currentValue = getCurrentValue(state.settings, `${config.currentParentPath}.${config.countryKey}`) || 1;
  React.useEffect(() => {
    $(inputRef.current).autocomplete({
      source: all_countries,
      change: (event, ui) => {
        dispatchReplace(config.countryKey, ui.item.value, currentValue);
      },
    });
    $(rangeRef.current).slider({
      range: false,
      min: 0.09,
      max: 1.0,
      step: 0.01,
      values: [1.0],
      slide: (event, ui) => dispatchUpdate(config.countryKey, ui.values[0]),
    });
  }, [currentValue]);
  const countryLabel = (
    <div>
      Country: <input ref={inputRef} type="text" defaultValue={config.countryKey} />
    </div>
  );
  return (
    <div className="country-entry">
      {typeof currentValue === 'object' ? (
        <div>
          {countryLabel}
          <SetupUI
            state={state}
            dispatch={dispatch}
            currentPath={`${config.currentParentPath}.${config.countryKey}`}
          ></SetupUI>
        </div>
      ) : (
        <div>
          {countryLabel}
          <div>
            Multiplier:
            <input type="text" readOnly={true} className="slider-value" value={currentValue} />
            <div ref={rangeRef}></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceSliderControl({ state, dispatch, config }) {
  const inputRef = React.useRef(null);
  const rangeRef = React.useRef(null);
  const dispatchUpdate = (deviceKey, value) =>
    dispatch({
      type: 'setValue',
      currentPath: `${config.currentParentPath}.${deviceKey}`,
      value: value,
    });
  const dispatchReplace = (oldDeviceKey, deviceKey, value) =>
    dispatch({
      type: 'replaceValue',
      parentPath: config.currentParentPath,
      oldKey: oldDeviceKey,
      key: deviceKey,
      value: value,
    });
  const currentValue = getCurrentValue(state.settings, `${config.currentParentPath}.${config.deviceKey}`) || 1;
  React.useEffect(() => {
    $(inputRef.current).autocomplete({
      source: all_devices,
      change: (event, ui) => {
        dispatchReplace(config.deviceKey, ui.item.value, currentValue);
      },
    });
    $(rangeRef.current).slider({
      range: false,
      min: 0.09,
      max: 1.0,
      step: 0.01,
      values: [1.0],
      slide: (event, ui) => dispatchUpdate(config.deviceKey, ui.values[0]),
    });
  }, []);
  const deviceLabel = (
    <div>
      Device: <input ref={inputRef} type="text" defaultValue={config.deviceKey} />
    </div>
  );
  return (
    <div className="device-entry">
      {typeof currentValue === 'object' ? (
        <div>
          {deviceLabel}
          <SetupUI
            state={state}
            dispatch={dispatch}
            currentPath={`${config.currentParentPath}.${config.deviceKey}`}
          ></SetupUI>
        </div>
      ) : (
        <div>
          {deviceLabel}
          <div>
            Multiplier:
            <input type="text" readOnly={true} className="slider-value" value={currentValue} />
            <div ref={rangeRef}></div>
          </div>
        </div>
      )}
    </div>
  );
}

function NestableControl({ state, dispatch, currentPath, children }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="nest-container">
      <div className="row">
        <div className="col col-12">
          <div className="nest-container">
            {menuOpen ? (
              <div className="nest-menu">
                <button className="btn btn-link" type="button" onClick={() => setMenuOpen(false)}>
                  x
                </button>
                <SetupTools
                  state={state}
                  dispatch={dispatch}
                  cascadePath={currentPath}
                  onClick={() => setMenuOpen(false)}
                />
                <button
                  className="btn btn-link"
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'setValue', currentPath: currentPath, value: 1 });
                    setMenuOpen(false);
                  }}
                >
                  Reset to Value
                </button>
              </div>
            ) : (
              <div>
                <button className="btn btn-light btn-small nest-button" type="button" onClick={() => setMenuOpen(true)}>
                  *
                </button>
              </div>
            )}
          </div>
          <div className="nest-child">{children}</div>
        </div>
      </div>
    </div>
  );
}

function UserOSControl({ state, dispatch, config }) {
  return (
    <div className="setup-group">
      <h5 className="setup-group-title">{config.title}</h5>
      <NestableControl state={state} dispatch={dispatch} currentPath={`${config.currentPath}.android`}>
        <SliderControl
          state={state}
          dispatch={dispatch}
          config={{ title: 'Android:', currentPath: `${config.currentPath}.android` }}
        />
      </NestableControl>
      <NestableControl state={state} dispatch={dispatch} currentPath={`${config.currentPath}.ios`}>
        <SliderControl
          state={state}
          dispatch={dispatch}
          config={{ title: 'IOS:', currentPath: `${config.currentPath}.ios` }}
        />
      </NestableControl>
      <SliderControl
        state={state}
        dispatch={dispatch}
        config={{ title: 'Default:', currentPath: `${config.currentPath}.default` }}
      />
    </div>
  );
}

function GenderControl({ state, dispatch, config }) {
  return (
    <div className="setup-group">
      <h5 className="setup-group-title">{config.title}</h5>
      <NestableControl state={state} dispatch={dispatch} currentPath={`${config.currentPath}.male`}>
        <SliderControl
          state={state}
          dispatch={dispatch}
          config={{ title: 'Male:', currentPath: `${config.currentPath}.male` }}
        />
      </NestableControl>
      <NestableControl state={state} dispatch={dispatch} currentPath={`${config.currentPath}.female`}>
        <SliderControl
          state={state}
          dispatch={dispatch}
          config={{ title: 'Female:', currentPath: `${config.currentPath}.female` }}
        />
      </NestableControl>
      <SliderControl
        state={state}
        dispatch={dispatch}
        config={{ title: 'Default:', currentPath: `${config.currentPath}.default` }}
      />
    </div>
  );
}

function AgeControl({ state, dispatch, config }) {
  const children = [];
  const setting = getCurrentValue(state.settings, config.currentPath);
  console.log('got value:', setting);
  let maxTo = 17;
  Object.keys(setting).forEach((key) => {
    if (key === 'default') {
      children.push(
        <SliderControl
          key={key}
          state={state}
          dispatch={dispatch}
          config={{ title: 'Default:', currentPath: `${config.currentPath}.default` }}
        />
      );
    } else {
      const [fromStr, toStr] = key.split('-');
      const from = parseInt(fromStr);
      const to = parseInt(toStr);
      if (maxTo < to) {
        maxTo = to;
      }
      children.push(
        <NestableControl key={key} state={state} dispatch={dispatch} currentPath={`${config.currentPath}.${key}`}>
          <AgeSliderControl
            state={state}
            dispatch={dispatch}
            config={{ currentParentPath: config.currentPath, from, to }}
          />
        </NestableControl>
      );
    }
  });
  const addNewAgeSegment = () => {
    dispatch({ type: 'setValue', currentPath: `${config.currentPath}.${maxTo + 1}-${maxTo + 2}`, value: 1 });
  };
  return (
    <div className="setup-group">
      <h5 className="setup-group-title">{config.title}</h5>
      {children}
      <br />
      <div>
        <button type="button" className="btn btn-light" onClick={addNewAgeSegment}>
          + Age Segment
        </button>
      </div>
    </div>
  );
}

function CountryControl({ state, dispatch, config }) {
  const setting = getCurrentValue(state.settings, config.currentPath);
  const currentCountries = Object.keys(setting);
  const usableCountries = _.difference(all_countries, currentCountries);
  const addNewCountrySegment = () => {
    dispatch({ type: 'setValue', currentPath: `${config.currentPath}.${usableCountries[0]}`, value: 1 });
  };

  const children = [];
  Object.keys(setting).forEach((key) => {
    children.push(
      <NestableControl key={key} state={state} dispatch={dispatch} currentPath={`${config.currentPath}.${key}`}>
        <CountrySliderControl
          state={state}
          dispatch={dispatch}
          config={{ countryKey: key, currentParentPath: config.currentPath }}
        />
      </NestableControl>
    );
  });

  return (
    <div className="setup-group">
      <h5 className="setup-group-title">{config.title}</h5>
      {children}
      <br />
      <div className="form-group">
        <button className="btn btn-light" type="button" onClick={addNewCountrySegment}>
          + Country Segment
        </button>
      </div>
    </div>
  );
}

function UserDeviceControl({ state, dispatch, config }) {
  const setting = getCurrentValue(state.settings, config.currentPath);
  const currentDevices = Object.keys(setting);
  const usableDevices = _.difference(all_devices, currentDevices);
  const addNewDeviceSegment = () => {
    dispatch({ type: 'setValue', currentPath: `${config.currentPath}.${usableDevices[0]}`, value: 1 });
  };

  const children = [];
  Object.keys(setting).forEach((key) => {
    if (key === 'default') {
      children.push(
        <DeviceSliderControl
          key={key}
          state={state}
          dispatch={dispatch}
          config={{ deviceKey: key, currentParentPath: config.currentPath }}
        />
      );
    } else {
      children.push(
        <NestableControl key={key} state={state} dispatch={dispatch} currentPath={`${config.currentPath}.${key}`}>
          <DeviceSliderControl
            state={state}
            dispatch={dispatch}
            config={{ deviceKey: key, currentParentPath: config.currentPath, usableDevices }}
          />
        </NestableControl>
      );
    }
  });

  return (
    <div className="setup-group">
      <h5 className="setup-group-title">{config.title}</h5>
      {children}
      <br />
      <div className="form-group">
        <button className="btn btn-light" type="button" onClick={addNewDeviceSegment}>
          + Device Segment
        </button>
      </div>
    </div>
  );
}

function AppAccessTokenSetup({ state, dispatch }) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="ad-set-id-input">Ad Set ID</label>
        <input
          type="text"
          className="form-control"
          placeholder=""
          value={state.adSetId}
          onChange={(e) => dispatch({ type: 'setAdSetId', value: e.target.value })}
        />
        <small id="ad-set-id-input-help" className="form-text text-muted">
          Ad set must be using conversion optimization.
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="access-token-input">Access Token</label>
        <input
          type="text"
          className="form-control"
          placeholder=""
          value={state.accessToken}
          onChange={(e) => dispatch({ type: 'setAccessToken', value: e.target.value })}
        />
        <small id="access-token-input-help" className="form-text text-muted">
          See instructions for obtaining an access token.
        </small>
      </div>
    </>
  );
}

function SetupTools({ state, dispatch, cascadePath, onClick }) {
  const addCascade = (parentPath, newPath, value) => {
    dispatch({ type: 'addCascade', parentPath, newPath, value });
    onClick && onClick();
  };

  return (
    <div className="btn-group">
      <button
        className="btn btn-light"
        type="button"
        onClick={() => addCascade(cascadePath, 'user_os', { android: 1, ios: 1, default: 1 })}
      >
        + Impression Device OS
      </button>
      <button
        className="btn btn-light"
        type="button"
        onClick={() => addCascade(cascadePath, 'gender', { male: 1, female: 1, default: 1 })}
      >
        + Gender
      </button>
      <button className="btn btn-light" type="button" onClick={() => addCascade(cascadePath, 'age', { default: 1 })}>
        + Age
      </button>
      <button
        className="btn btn-light"
        type="button"
        onClick={() => addCascade(cascadePath, 'home_locations', { countries: { AU: 1 } })}
      >
        + Country
      </button>
      <button
        className="btn btn-light"
        type="button"
        onClick={() => addCascade(cascadePath, 'user_device', { default: 1 })}
      >
        + User Device
      </button>
    </div>
  );
}

function GraphAPISubmit({ state, dispatch }) {
  const toPayloadJSON = (settings) => settings;
  const sendAlert = (text, isError) => {
    let $alert = $('#alert-text-box');
    if (isError) {
      $alert.removeClass('alert-success');
      $alert.addClass('alert-danger');
    } else {
      $alert.removeClass('alert-danger');
      $alert.addClass('alert-success');
    }
    $('#alert-text').text(text);
    $alert.show();
  };

  const callGraphAPI = () => {
    const xhr = $.ajax({
      url: 'https://graph.facebook.com/v13.0/' + state.adSetId,
      type: 'POST',
      data: {
        access_token: state.accessToken,
        bid_adjustments: { user_groups: toPayloadJSON(state.settings) },
      },
      success: (res) => {
        console.log(res);
        fbq('track', 'BidModApplied');
        sendAlert('Success!', false);
      },
      error: (res) => {
        let errorText = res.responseJSON.error.message + ' fb_traceid: ' + res.responseJSON.error.fbtrace_id;
        fbq('track', 'LALFailure');
        sendAlert(errorText, true);
      },
    });

    console.log(xhr);
  };

  return (
    <div>
      <div>
        <div className="setup-payload-preview">
          <p>Payload Preview:</p>
          <code>
            <pre>destination API endpoint: {'https://graph.facebook.com/v13.0/' + state.adSetId}</pre>
            <pre>access_token={state.accessToken}</pre>
            <pre>bid_adjustments={JSON.stringify({ user_groups: toPayloadJSON(state.settings) }, null, 2)}</pre>
          </code>
          <button type="button" id="submit-button" className="btn btn-primary" onClick={callGraphAPI}>
            Submit
          </button>
        </div>
      </div>
      <br />
      <br />
      <div
        id="alert-text-box"
        className="alert alert-success alert-dismissible fade show"
        role="alert"
        style={{ display: 'none' }}
      >
        <span id="alert-text"></span>
        <button type="button" className="close" onClick={() => $('#alert-text-box').hide()}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  );
}

function RestartButton({ state, dispatch }) {
  return (
    <div className="btn-group">
      <button className="btn btn-danger" type="button" onClick={() => dispatch({ type: 'reset' })}>
        Restart Setup
      </button>
    </div>
  );
}

function RootContainer() {
  const [state, dispatch] = React.useReducer(reducer, initState);
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col col-8">
          <h1>Bid Multiplier Tool</h1>
          <form>
            <RestartButton state={state} dispatch={dispatch} />{' '}
            <SetupTools state={state} dispatch={dispatch} cascadePath={''} />
            <br />
            <br />
            <SetupUI state={state} dispatch={dispatch} currentPath={''} />
          </form>
        </div>
        <div className="col col-4 setup-right-panel">
          <AppAccessTokenSetup state={state} dispatch={dispatch} />
          <GraphAPISubmit state={state} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}
