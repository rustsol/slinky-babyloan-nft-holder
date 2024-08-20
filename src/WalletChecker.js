import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ClipLoader } from 'react-spinners';
import * as XLSX from 'xlsx';
import { Tooltip } from 'react-tooltip';

const WalletChecker = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localDataLoading, setLocalDataLoading] = useState(false);
  const [localAddresses, setLocalAddresses] = useState([]);
  const [message, setMessage] = useState('');
  const [searchOption, setSearchOption] = useState('google'); // Default to Google Sheets

  const sheetId = '1beY6FRDhwafhu59i7L7WJv7cAtotzqRHq8oCDhDNfYU';
  const sheetGid = '151944572'; // The gid for the specific sheet tab

  // Fetch and preprocess the local Excel data when the component mounts
  useEffect(() => {
    const loadLocalData = async () => {
      setLocalDataLoading(true);
      try {
        const response = await fetch('/assets/PioneerPass.xlsx');
        const data = await response.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const addresses = rows
          .filter(row => row[0] !== undefined)  // Filter out empty rows
          .map(row => row[0].trim().toLowerCase());  // Trim and convert to lowercase

        console.log('Preloaded local wallet addresses:', addresses);
        setLocalAddresses(addresses);
      } catch (error) {
        console.error('Error reading local Excel file:', error);
        toast.error('Error preloading local Excel file. Please try again later.');
      } finally {
        setLocalDataLoading(false);
      }
    };

    loadLocalData();
  }, []);

  const fetchAddressesFromGoogle = async () => {
    try {
      const res = await axios.get(
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${sheetGid}`
      );
      const rows = res.data.split('\n').map((row) => row.split(','));
      return rows.map((row) => row[0].replace(/"/g, '').trim().toLowerCase());
    } catch (error) {
      toast.error('Error fetching data from Google Sheets. Please try again later.');
      return [];
    }
  };

  const fetchAddresses = useMemo(async () => {
    if (searchOption === 'local') {
      return localAddresses;
    } else {
      return await fetchAddressesFromGoogle();
    }
  }, [searchOption, localAddresses]);

  const handleInputChange = (e) => {
    setWalletAddress(e.target.value.trim());
  };

  const handleOptionChange = (e) => {
    setSearchOption(e.target.value);
  };

  const debouncedCheckEligibility = useCallback(
    debounce(async (address) => {
      console.log('Searching for address:', address.toLowerCase());

      if (!address) {
        setMessage('');
        setIsLoading(false);
        return;
      }

      const addressList = await fetchAddresses;
      console.log('Address list to search:', addressList);

      if (addressList.includes(address.toLowerCase())) {
        toast.success('You are eligible!');
        setMessage('You are eligible!');
      } else {
        toast.warn("Sorry, we didn't find your wallet address in the list.");
        setMessage("Sorry, we didn't find your wallet address in the list.");
      }

      setIsLoading(false); // Re-enable the button
    }, 500),
    [fetchAddresses, walletAddress]
  );

  const handleCheckEligibility = () => {
    setIsLoading(true); // Disable the button and show loader
    debouncedCheckEligibility(walletAddress);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Slinky Babylon Pioneer NFT Holder Checker</h1>
      <input
        type="text"
        value={walletAddress}
        onChange={handleInputChange}
        placeholder="Enter your wallet address"
        style={styles.input}
      />
      <div style={styles.optionContainer}>
        <label data-tooltip-id="localTip">
          <input
            type="radio"
            value="local"
            checked={searchOption === 'local'}
            onChange={handleOptionChange}
            disabled={localDataLoading} // Disable if data is still loading
          />
          Search from Local Excel
        </label>
        <Tooltip id="localTip" place="top" effect="solid">
          Downloaded for faster search.
        </Tooltip>

        <label data-tooltip-id="googleTip">
          <input
            type="radio"
            value="google"
            checked={searchOption === 'google'}
            onChange={handleOptionChange}
          />
          Search from Google Sheets
        </label>
        <Tooltip id="googleTip" place="top" effect="solid">
          Live Google Drive link.
        </Tooltip>
      </div>
      <button
        onClick={handleCheckEligibility}
        style={{ ...styles.button, backgroundColor: isLoading ? '#ccc' : '#007bff' }}
        disabled={isLoading}
      >
        {isLoading ? <ClipLoader size={20} color={"#fff"} /> : 'Check Eligibility'}
      </button>
      {localDataLoading && searchOption === 'local' && (
        <p style={styles.loadingMessage}>Loading local data, please wait...</p>
      )}
      <p style={styles.message}>{message}</p>
      <ToastContainer />
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    padding: '2rem',
    background: '#f0f4f8',
    borderRadius: '10px',
    maxWidth: '500px',
    margin: '0 auto',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '2rem',
    marginBottom: '1.5rem',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    borderRadius: '5px',
    border: '1px solid #ccc',
    width: '100%',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  optionContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  button: {
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    borderRadius: '5px',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  loadingMessage: {
    fontSize: '1rem',
    color: '#007bff',
    marginTop: '1rem',
  },
  message: {
    marginTop: '1rem',
    fontSize: '1.25rem',
    color: '#333',
  },
};

export default WalletChecker;
