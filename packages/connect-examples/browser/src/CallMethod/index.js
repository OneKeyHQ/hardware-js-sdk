import React, { useState, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import './index.css';

const CallMethod = ({ title, option, onCall }) => {
  const [data, setData] = useState(option);
  const [result, setResult] = useState('');
  const [resultSuccess, setResultSUccess] = useState(undefined);

  const onSubmit = async e => {
    e.preventDefault();
    const callData = {};
    data.forEach(item => {
      if (item.name.includes('.')) {
        const split = item.name.split('.');
        for (let i = 0; i < split.length - 1; i++) {
          callData[split[i]] = callData[split[i]] || {};
        }
        callData[split[split.length - 2]][split[split.length - 1]] = item.value;
      } else {
        callData[item.name] = item.value;
      }
    });
    const res = await onCall(callData);
    setResultSUccess(res.success);
    setResult(JSON.stringify(res));
  };

  const onChange = e => {
    const { name, value, checked } = e.target;

    setData(prevState => {
      const newData = [...prevState];
      const index = newData.findIndex(item => item.name === name);
      if (index !== -1) {
        const currItem = newData[index];
        if (currItem.type === 'checkbox') {
          newData[index] = { ...currItem, value: checked };
        } else {
          newData[index] = { ...currItem, value };
        }
      }
      return newData;
    });
  };

  return (
    <div className="card">
      <form onSubmit={onSubmit}>
        <header className="card_header">{title}</header>
        <div className="card_content">
          {data.map((item, index) => (
            <div key={index} className="input_item">
              <label>{item.name}</label>
              <input type={item.type} name={item.name} value={item.value} onChange={onChange} />
            </div>
          ))}

          <div className="input_item">
            <p>
              <span>Result: </span>
              {resultSuccess && <span className="success">Success</span>}
              {resultSuccess === false && <span className="failure">Failure</span>}
            </p>
            <textarea value={result} />
          </div>
        </div>
        <button className="card_footer" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
};

CallMethod.propTypes = {
  title: PropTypes.string,
  option: PropTypes.array,
  onCall: PropTypes.func,
};
export default CallMethod;
