'use client';

import React, { useState, useEffect } from 'react';
import axios from "axios";

const performVectorSearch = async (doctorQuery: string) => {
    try {
        const response = await axios.post("http://localhost:8686/graphql", {
            query: `
                query($doctorQueryEmbedding: [String!]!) {
                    performVectorSearch(doctorQueryEmbedding: $doctorQueryEmbedding) {
                        reportChunk
                    }
                }
            `,
            variables: {
                doctorQueryEmbedding: [doctorQuery],
            },
        });
        return response.data.data.performVectorSearch[0].reportChunk;
    } catch (err) {
        console.error("Error performing vector search:", err);
        throw new Error("Failed to fetch vector search results.");
    }
};

const ClinicalQuery = () => {
    const [query, setQuery] = useState<string>('');
    const [result, setResult] = useState<string>('');
    const [isListening, setIsListening] = useState<boolean>(false);
    const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            setSpeechRecognition(recognition);
        } else {
            setResult('Sorry, your browser does not support speech recognition.');
        }
    }, []);

    const handleVoiceStart = () => {
        if (speechRecognition) {
            setIsListening(true);
            speechRecognition.start();

            speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
                const lastResult = event.results[event.results.length - 1];
                const spokenQuery = lastResult[0].transcript;
                setQuery(spokenQuery);
            };

            speechRecognition.onerror = () => {
                setResult('Error occurred while trying to recognize your voice.');
                setIsListening(false);
            };
        }
    };

    const handleVoiceStop = () => {
        if (speechRecognition) {
            setIsListening(false);
            speechRecognition.stop();
            processQuery(query);
        }
    };

    const processQuery = async (voiceQuery: string) => {
        try {
            const vectorSearchResult = await performVectorSearch(voiceQuery);
            setResult(`Query: "${voiceQuery}"\n\nResult: ${vectorSearchResult}`);
        } catch (error) {
            setResult('Failed to process your query. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-6 sm:px-8">
            <div className="max-w-3xl w-full bg-white p-8 rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-center text-blue-600 mb-4">Clinical Query</h2>
                <p className="text-sm text-gray-500 text-center italic mb-8">
                    Speak your query to get instant results.
                </p>

                <div className="flex flex-col items-center space-y-6">
                    {!isListening && (
                        <button
                            onClick={handleVoiceStart}
                            className="p-4 bg-blue-600 text-white rounded-full text-lg font-semibold shadow-lg hover:bg-blue-700 focus:outline-none"
                        >
                            Start Listening
                        </button>
                    )}

                    {isListening && (
                        <button
                            onClick={handleVoiceStop}
                            className="p-4 bg-green-600 text-white rounded-full text-lg font-semibold shadow-lg hover:bg-green-700 focus:outline-none"
                        >
                            Stop Listening
                        </button>
                    )}

                    <div className="text-center">
                        {query ? (
                            <p className="text-lg font-medium text-gray-700">
                                <strong>Your Query:</strong> {query}
                            </p>
                        ) : (
                            <p className="text-lg text-gray-500">No query detected.</p>
                        )}
                    </div>

                    <div className="mt-6 p-4 bg-gray-100 rounded-md">
                        <h3 className="font-bold text-blue-600">Result:</h3>
                        <p className="text-gray-700 mt-2">{result || "Waiting for your query..."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicalQuery;
