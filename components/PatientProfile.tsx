'use client';
import React, { useState, useEffect } from 'react';
import CalendarTodayIcon from "./icons/CalendarIcon";
import FemaleIcon from "./icons/FemaleIcon";
import PhoneIcon from "./icons/PhoneIcon";
import { formatDate } from "./utils/formatDate";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import Tesseract from 'tesseract.js';
import pdfToText from 'react-pdftotext';
import axios from "axios";

const staticPdfUrl = '/report.pdf'; // Assuming your PDF is placed inside the 'public' folder

const generateChunks = async ({ reportText }: { reportText: string }) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 90,
        chunkOverlap: 1,
    });

    try {
        const result = await splitter.createDocuments([reportText]);
        console.log(result);
        return result.map((doc: any) => doc.pageContent); // Return the chunked text
    } catch (error) {
        console.error("Error splitting text:", error);
        throw error;
    }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        pdfToText(file)
            .then((text: string) => {
                if (text.trim().length > 0) {
                    console.log('Extracted text from PDF:', text);
                    resolve(text);
                } else {
                    // Fallback to OCR if no text is found
                    extractTextWithOCR(file).then(resolve).catch(reject);
                }
            })
            .catch((error) => {
                console.error("Failed to extract text from PDF", error);
                reject(error);
            });
    });
};

const extractTextWithOCR = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const target = e.target;
            if (target && target.result) { // Ensure target is not null
                const img = new Image();
                img.src = target.result as string; // Type assertion to string, as target.result is a Data URL

                img.onload = () => {
                    Tesseract.recognize(img, 'eng')
                        .then(({ data: { text } }) => {
                            console.log('Extracted text with OCR:', text);
                            resolve(text);
                        })
                        .catch((err) => {
                            console.error('OCR failed', err);
                            reject(err);
                        });
                };
            } else {
                console.error('Failed to read file');
                reject('Failed to read file');
            }
        };

        reader.readAsDataURL(file);
    });
};


interface StorePatientReportResponse {
    data: {
        storePatientReport: string;
    };
}

interface StorePatientReportVariables {
    patientId: string;
    reportTitle: string;
    reportChunks: Array<string>;
}

async function callGraphQLAPI(variables: StorePatientReportVariables): Promise<string> {
    const query = `query StorePatientReport($patientId: String!, $reportTitle: String!, $reportChunks: [String!]!) {
  storePatientReport(patientId: $patientId, reportTitle: $reportTitle, reportChunks: $reportChunks)
}`;


    const response = await fetch('http://localhost:8686/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            variables,
        })
    });

    const result = await response.json() as StorePatientReportResponse;
    return result.data.storePatientReport;
}

const PatientProfile = ({ patient }: { patient: any }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchStaticPdf = async () => {
            try {
                const response = await fetch(staticPdfUrl);
                const blob = await response.blob();
                const pdfFile = new File([blob], 'report.pdf', { type: 'application/pdf' });
                setFile(pdfFile);
            } catch (error) {
                console.error('Error fetching static PDF:', error);
            }
        };

        fetchStaticPdf();
    }, []);

    // Handle submit to backend
    const handleSubmit = async () => {
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        setIsUploading(true);
        setUploadError(false);

        try {
            const extractedText = await extractTextFromPDF(file);
            console.log('Extracted text:', extractedText);

            // Step 1: Generate chunks from extracted text
            const reportChunks = await generateChunks({ reportText: extractedText });

            // Step 2: Call the GraphQL API to store the report

            const patientReportVariables: StorePatientReportVariables = {
                patientId: '123', // Assuming patient.patientId is available
                reportTitle: 'Lakshay Report', // Or use dynamic title
                reportChunks: await generateChunks({ reportText: extractedText }), // Assuming extractedText is available
            };
            const response = await callGraphQLAPI(patientReportVariables);


        } catch (error) {
            setIsUploading(false);
            setUploadError(true);
            alert('Upload Failed: ' + error);
        }
    };

    const formattedDate = formatDate(new Date(patient.date_of_birth));

    return (
        <section role="list" className="rounded-3xl p-5 bg-white divide-y divide-gray-100">
            <div className="grid grid-cols-1 justify-items-center gap-6 pb-4">
                <h2 className="text-2xl font-medium">{patient.name}</h2>
                <br /><br />
                <div className="w-full grid grid-cols-6 gap-8 grid-rows-1">
                    <div className="col-span-1 text-center m-auto bg-gray-100 p-4 rounded-full">
                        <CalendarTodayIcon />
                    </div>
                    <div className="col-span-5">
                        <h3 className="font-light">Date Of Birth</h3>
                        <p className="font-semibold">{formattedDate}</p>
                    </div>
                    <div className="col-span-1 text-center m-auto bg-gray-100 p-0.5 rounded-full">
                        <FemaleIcon />
                    </div>
                    <div className="col-span-5">
                        <h3 className="font-light">Gender</h3>
                        <p className="font-semibold">{patient.gender}</p>
                    </div>
                    <div className="col-span-1 text-center m-auto bg-gray-100 p-0.5 rounded-full">
                        <PhoneIcon />
                    </div>
                    <div className="col-span-5">
                        <h3 className="font-light">Contact Info.</h3>
                        <p className="font-semibold">{patient.phone_number}</p>
                    </div>
                </div>

                <div className="mt-8 justify-self-center">
                    <button
                        onClick={handleSubmit}
                        className="bg-teal-300 hover:bg-teal-500 text-black font-semibold px-12 py-4 rounded-full"
                    >
                        {isUploading ? "Uploading..." : "Upload Report"}
                    </button>

                    {isUploading && <p className="text-center text-teal-500">Uploading...</p>}
                    {uploadError && <p className="text-center text-red-500">Upload Failed. Please try again.</p>}

                    {file && !isUploading && (
                        <button
                            onClick={handleSubmit}
                            className="mt-4 bg-teal-500 hover:bg-teal-700 text-white font-semibold px-12 py-4 rounded-full"
                        >
                            Submit
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

export default PatientProfile;
