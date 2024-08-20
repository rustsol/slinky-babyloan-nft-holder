import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ClipLoader, BarLoader } from 'react-spinners';
import * as XLSX from 'xlsx';
import { Tooltip } from 'react-tooltip';
import './design.css';  // Import the CSS file

const WalletChecker = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Initial loading state
  const [localDataLoading, setLocalDataLoading] = useState(false);
  const [localAddresses, setLocalAddresses] = useState([]);
  const [message, setMessage] = useState('');
  const [searchOption, setSearchOption] = useState('google'); // Default to Google Sheets
  const [showModal, setShowModal] = useState(false);

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
        setIsLoading(false); // End loading state after data is loaded
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
        setShowModal(false);
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

      setIsLoading(false);
      setShowModal(false); // Hide the modal when the check is done
    }, 500),
    [fetchAddresses, walletAddress]
  );

  const handleCheckEligibility = () => {
    setIsLoading(true); 
    setShowModal(true); // Show the modal when the button is clicked
    debouncedCheckEligibility(walletAddress);
  };

  return (
    <div className="outerContainer">
      {isLoading && (
        <div className="loadingOverlay">
          <BarLoader color={"#1a73e8"} width="100%" className="progressBar" />
          <div className="loadingContent">
            <ClipLoader size={50} color={"#1a73e8"} />
            <p className="loadingText">Loading, please wait...</p>
          </div>
        </div>
      )}

      <div className="container">
        <h1 className="title">Slinky Babylon Pioneer NFT Holder Checker</h1>
        <input
          type="text"
          value={walletAddress}
          onChange={handleInputChange}
          placeholder="Enter your wallet address"
          className="input"
          disabled={isLoading} // Disable input during loading
        />
        <div className="optionContainer">
          <label data-tooltip-id="localTip" className="radioLabel">
            <input
              type="radio"
              value="local"
              checked={searchOption === 'local'}
              onChange={handleOptionChange}
              disabled={localDataLoading || isLoading} // Disable if data is still loading
            />
            Search from Local Excel
          </label>
          <Tooltip id="localTip" place="top" effect="solid">
            Downloaded for faster search.
          </Tooltip>

          <label data-tooltip-id="googleTip" className="radioLabel">
            <input
              type="radio"
              value="google"
              checked={searchOption === 'google'}
              onChange={handleOptionChange}
              disabled={isLoading} // Disable during loading
            />
            Search from Google Sheets
          </label>
          <Tooltip id="googleTip" place="top" effect="solid">
            Live Google Drive link.
          </Tooltip>
        </div>
        <button
          onClick={handleCheckEligibility}
          className="button"
          style={{ backgroundColor: isLoading ? '#ccc' : '#1a73e8' }}
          disabled={isLoading}
        >
          {isLoading ? <ClipLoader size={20} color={"#fff"} /> : 'Check Eligibility'}
        </button>
        {localDataLoading && searchOption === 'local' && (
          <p className="loadingMessage">Loading local data, please wait...</p>
        )}
        <p className="message">{message}</p>
        <ToastContainer />
      </div>

      {showModal && (
        <div className="modalOverlay">
          <div className="modal">
            <ClipLoader size={50} color={"#1a73e8"} />
            <p className="modalText">Please wait while we process your data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletChecker;
