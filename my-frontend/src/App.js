import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [file, setFile] = useState(null);
    const [question, setQuestion] = useState('');
    const [result, setResult] = useState(null);
    const [query, setQuery] = useState('');
    const [error, setError] = useState(null);
    const [plots, setPlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [csvData, setCsvData] = useState({ columns: [], rows: [] });

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setError(null);
            setShowDetails(false); // Reset "Show Details" button state
        } else {
            setError({ message: 'Please upload a valid CSV file.' });
        }
    };

    const handleQuestionChange = (event) => {
        setQuestion(event.target.value);
    };

    const handleShowDetails = () => {
        if (file) {
            // Read and parse the CSV file
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const rows = text.split('\n').map(row => row.split(','));
                const columns = rows[0];
                const data = rows.slice(1, 6); // Preview first 5 rows
                setCsvData({ columns, rows: data });
                setShowDetails(true);
            }; 
            reader.readAsText(file);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!file) {
            setError({ message: 'Please upload a CSV file.' });
            return;
        }
        if (!question) {
            setError({ message: 'Please enter a question.' });
            return;
        }

        setLoading(true); 
        const formData = new FormData();
        formData.append('file', file);
        formData.append('question', question);

        const axiosSource = axios.CancelToken.source();
        const timeoutDuration = 120000; // Timeout duration in milliseconds (2 minutes)

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => {
                axiosSource.cancel(); // Cancel the request
                reject(new Error('Request timed out'));
            }, timeoutDuration)
        );

        try {
            const response = await Promise.race([
                axios.post('http://localhost:5000/api/query', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    cancelToken: axiosSource.token,
                }),
                timeoutPromise,
            ]);

            setQuery(response.data.query);
            setResult(response.data.result);
            setPlots(response.data.plots);
            setError(null);
        } catch (error) {
            if (axios.isCancel(error)) {
                setError({ message: 'Request canceled due to timeout.' });
            } else if (error.message === 'Request timed out') {
                setError({ message: 'Request timed out. Please try again.' });
            } else {
                console.error('Error submitting query:', error);
                setError(error.response ? error.response.data : { message: 'Error submitting query' });
            }
            setQuery('');
            setResult(null);
            setPlots([]);
        } finally {
            setLoading(false); // Hide loader when request completes
        }
    };

    return (
        <div className="App">
            <div className="background-animation"></div> {/* Background animation */}
            {loading && (
                <div className="loader">
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            )} {/* Complex Bouncing Balls Loader */}
            <h1>AI DRIVEN SQL QUERY BUILDER FROM TEXT</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Upload CSV:
                        <input type="file" onChange={handleFileChange} />
                    </label>
                </div>
                <div>
                    <label>
                        Question:
                        <input type="text" value={question} onChange={handleQuestionChange} />
                    </label>
                </div>
                <button 
                    type="button" 
                    onClick={handleShowDetails} 
                    disabled={!file} // Disable button if no file is selected
                >
                    Show Details
                </button>
                <button type="submit">Submit</button>
            </form>
            {showDetails && (
                <div className="csv-preview">
                    <div className="columns">
                        <h2>Columns</h2>
                        <ul>
                            {csvData.columns.map((col, index) => (
                                <li key={index}>{col}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="table-container">
                        <h2>Preview</h2>
                        <table>
                            <thead>
                                <tr>
                                    {csvData.columns.map((col, index) => (
                                        <th key={index}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {csvData.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={cellIndex}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {query && (
                <div className="result-box">
                    <h2>Generated SQL Query:</h2>
                    <pre>{query}</pre>
                </div>
            )}
            {result && result.length > 0 && (
                <div className="result-box">
                    <h2>Query Result:</h2>
                    <table>
                        <thead>
                            <tr>
                                {Object.keys(result[0]).map((key) => (
                                    <th key={key}>{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {Object.keys(row).map((key) => (
                                        <td key={key}>{row[key]}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {plots.length > 0 && (
                <div>
                    <h2>Generated Plots:</h2>
                    {plots.map((plot, index) => (
                        <img key={index} src={`http://localhost:5000/${plot}`} alt={`Plot ${index}`} />
                    ))}
                </div>
            )}
            {error && (
                <div className="error">
                    <h2>Error:</h2>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

export default App;
