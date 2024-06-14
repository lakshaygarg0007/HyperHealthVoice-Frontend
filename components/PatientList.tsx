'use client'
import React, { useEffect, useState } from "react";
import MenuIcon from './icons/MenuIcon';
import axios from "axios";

// Define types for patient and report data
interface Patient {
    Id: string;
    name: string;
    age: number;
    contactNumber: string;
}

interface Report {
    reportId: string;
    reportTitle: string;
    reportDate: string;
}

const PatientList: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch patients' data
        const fetchPatients = async () => {
            try {
                const response = await axios.post("http://localhost:8686/graphql", {
                    query: `
                        query {
                            getPatientsList {
                                Id
                                name
                                age
                                contactNumber
                            }
                        }
                    `,
                });
                setPatients(response.data.data.getPatientsList);
            } catch (err) {
                console.error("Error fetching patients:", err);
                setError("Failed to fetch patients data.");
            }
        };

        fetchPatients();
    }, []);

    const fetchReports = async (patientId: string) => {
        try {
            const response = await axios.post("http://localhost:8686/graphql", {
                query: `
                query($patientId: String!) {
                    getReportsList(patientId: $patientId) {
                        reportId
                        patientId
                        reportTitle
                        reportDate
                    }
                }
            `,
                variables: {
                    patientId, // Pass patientId as a variable
                },
            }, {
                headers: {
                    "Content-Type": "application/json", // Ensure correct header
                },
            });

            // Assuming setReports and setError are state setters
            setReports(response.data.data.getReportsList); // Update reports with the fetched data
        } catch (err) {
            console.error("Error fetching reports:", err);
            setError("Failed to fetch reports."); // Update error state if the request fails
        }
    };

    const handlePatientClick = (patientId: string) => {
        setSelectedPatientId(patientId); // Set selected patient ID
        fetchReports(patientId); // Fetch reports for the clicked patient
    };

    return (
        <div>
            {error && <p className="text-red-500">{error}</p>}
            <ul role="list" className="rounded-3xl bg-white divide-y divide-gray-100">
                <li className="flex justify-between items-center gap-x-6 p-5">
                    <h2 className="text-2xl font-medium">Patients</h2>
                </li>
                {patients.map((patient) => (
                    <li
                        key={patient.Id}
                        className="flex justify-between gap-x-6 p-5 items-center cursor-pointer"
                        onClick={() => handlePatientClick(patient.Id)} // Handle click event
                    >
                        <div className="flex min-w-0 gap-x-4">
                            <div className="min-w-0 flex-auto">
                                <p className="text-sm font-semibold leading-6 text-gray-900">{patient.name}</p>
                                <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                                    Age: {patient.age}
                                </p>
                                <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                                    Contact: {patient.contactNumber}
                                </p>
                            </div>
                        </div>
                        <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-center">
                            <MenuIcon />
                        </div>
                    </li>
                ))}
            </ul>

            {/* Display Reports */}
            {selectedPatientId && (
                <div className="mt-6">
                    <h3 className="text-xl font-medium">Reports</h3>
                    <ul role="list" className="divide-y divide-gray-200 mt-4">
                        {reports.length > 0 ? (
                            reports.map((report) => (
                                <li key={report.reportId} className="p-4">
                                    <h4 className="text-lg font-semibold">{report.reportTitle}</h4>
                                    <p className="text-xs text-gray-500">Date: {report.reportDate}</p>
                                </li>
                            ))
                        ) : (
                            <p className="text-gray-500">No reports available for this patient.</p>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PatientList;
