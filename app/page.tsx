'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const API_URL = 'https://srijandubey.github.io/campus-api-mock/SRM-C1-25.json';
const SUGGESTION_LIMIT = 3;

interface Doctor {
    id: string;
    name: string;
    name_initials: string;
    photo: string;
    doctor_introduction: string;
    specialities: { name: string }[];
    fees: string;
    experience: string;
    languages: string[];
    clinic: {
        name: string;
        address: {
            locality: string;
            city: string;
            address_line1: string;
            location: string;
            logo_url: string;
        };
    };
    video_consult: boolean;
    in_clinic: boolean;
}

const getArrayFromQueryParam = (param: string | null): string[] => {
    return param ? param.split(',') : [];
};

export default function DoctorListingPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [specialties, setSpecialties] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState<string>('');
    const [suggestions, setSuggestions] = useState<Doctor[]>([]);
    const [isSuggestionBoxVisible, setIsSuggestionBoxVisible] = useState<boolean>(false);

    const [selectedConsultationType, setSelectedConsultationType] = useState<string>('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [selectedSort, setSelectedSort] = useState<string>('');

    useEffect(() => {
        const fetchDoctors = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: Doctor[] = await response.json();
                setAllDoctors(data || []);

                const uniqueSpecialties = [
                    ...new Set(
                        data
                            .flatMap(doc => doc.specialities?.map(spec => spec.name) || [])
                            .filter((spec): spec is string => typeof spec === 'string' && spec.trim() !== '')
                    ),
                ].sort();
                setSpecialties(uniqueSpecialties);

                const initialSearch = searchParams.get('search') || '';
                const initialConsultation = searchParams.get('consultation') || '';
                const validInitialSpecialties = getArrayFromQueryParam(searchParams.get('specialties'))
                    .filter(spec => uniqueSpecialties.includes(spec));
                const initialSort = searchParams.get('sort') || '';

                setSearchTerm(initialSearch);
                setSelectedConsultationType(initialConsultation);
                setSelectedSpecialties(validInitialSpecialties);
                setSelectedSort(initialSort);

            } catch (e: any) {
                console.error("Failed to fetch doctors:", e);
                setError('Failed to load doctor data. Please try again later.');
                setAllDoctors([]);
                setSpecialties([]);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    useEffect(() => {
        if (loading) return;

        const current = new URLSearchParams(Array.from(searchParams.entries()));

        if (searchTerm) current.set('search', searchTerm); else current.delete('search');
        if (selectedConsultationType) current.set('consultation', selectedConsultationType); else current.delete('consultation');
        if (selectedSpecialties.length > 0) current.set('specialties', selectedSpecialties.join(',')); else current.delete('specialties');
        if (selectedSort) current.set('sort', selectedSort); else current.delete('sort');

        const search = current.toString();
        const query = search ? `?${search}` : "";
        const newUrl = `${pathname}${query}`;
        const currentQueryString = searchParams.toString();
        const currentUrl = `${pathname}${currentQueryString ? '?' + currentQueryString : ''}`;

        if (newUrl !== currentUrl) {
            router.push(newUrl, { scroll: false });
        }
    }, [searchTerm, selectedConsultationType, selectedSpecialties, selectedSort]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSuggestions([]);
            setIsSuggestionBoxVisible(false);
            return;
        }
        if (allDoctors.length > 0) {
            const matchingDoctors = allDoctors
                .filter(doctor =>
                    doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, SUGGESTION_LIMIT);

            setSuggestions(matchingDoctors);
            setIsSuggestionBoxVisible(matchingDoctors.length > 0);
        } else {
            setSuggestions([]);
            setIsSuggestionBoxVisible(false);
        }
    }, [searchTerm, allDoctors]);

    useEffect(() => {
        if (loading) return;

        let doctors = [...allDoctors];

        if (searchTerm) {
            doctors = doctors.filter(doc =>
                doc.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedConsultationType) {
            doctors = doctors.filter(doc =>
                (selectedConsultationType === 'Video Consult' && doc.video_consult) ||
                (selectedConsultationType === 'In Clinic' && doc.in_clinic)
            );
        }

        if (selectedSpecialties.length > 0) {
            doctors = doctors.filter(doc =>
                selectedSpecialties.every(specFilter =>
                    doc.specialities?.some(s => s.name === specFilter)
                )
            );
        }

        if (selectedSort === 'fees') {
            doctors.sort((a, b) => {
                const feeA = parseInt(a.fees?.replace(/\D/g, '') || '0');
                const feeB = parseInt(b.fees?.replace(/\D/g, '') || '0');
                return feeA - feeB;
            });
        } else if (selectedSort === 'experience') {
            doctors.sort((a, b) => {
                const expA = parseInt(a.experience?.match(/\d+/)?.[0] || '0');
                const expB = parseInt(b.experience?.match(/\d+/)?.[0] || '0');
                return expB - expA;
            });
        }

        setFilteredDoctors(doctors);
    }, [searchTerm, selectedConsultationType, selectedSpecialties, selectedSort, allDoctors, loading]);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleSuggestionClick = (doctorName: string) => {
        setSearchTerm(doctorName);
        setSuggestions([]);
        setIsSuggestionBoxVisible(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (
                target.closest('[data-testid="autocomplete-input"]') === null &&
                target.closest('.suggestions-container') === null
            ) {
                setIsSuggestionBoxVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleConsultationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedConsultationType(event.target.value);
    };

    const handleSpecialtyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;
        setSelectedSpecialties(prev =>
            checked ? [...prev, value] : prev.filter(spec => spec !== value)
        );
    };

    const handleSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedSort(event.target.value);
    };

    const getSpecialtyTestId = (specialty: unknown): string => {
        if (typeof specialty !== 'string') {
            console.warn(`Invalid specialty type encountered: ${typeof specialty}`, specialty);
            const fallbackSuffix = String(specialty).replace(/[^a-zA-Z0-9]/g, '-') || 'invalid';
            return `filter-specialty-invalid-${fallbackSuffix}-${Math.random().toString(36).substring(7)}`;
        }
        const sanitized = specialty.replace(/[^a-zA-Z0-9]/g, '-');
        return `filter-specialty-${sanitized}`;
    };

    const verifyImage = (url: string) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 font-sans">
         
            <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 md:p-6 rounded-lg mb-6 shadow-lg text-center">
                <h1 className="text-2xl md:text-3xl font-bold mb-4">Find Your Doctor</h1>
                <p className="text-blue-100 mb-4">Book appointments with trusted healthcare professionals</p>
                <div className="relative max-w-xl mx-auto">
                    <input
                        type="text"
                        placeholder="Search for doctors by name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => setIsSuggestionBoxVisible(suggestions.length > 0 && searchTerm.length > 0)}
                        data-testid="autocomplete-input"
                        aria-autocomplete="list"
                        aria-controls="autocomplete-suggestions"
                        className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-gray-900 outline-none placeholder-gray-400"
                    />
                    {isSuggestionBoxVisible && suggestions.length > 0 && (
                        <ul
                            id="autocomplete-suggestions"
                            className="suggestions-container absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded-b-md shadow-lg mt-1 max-h-60 overflow-y-auto text-gray-900"
                            role="listbox"
                        >
                            {suggestions.map((doc) => (
                                <li
                                    key={doc.id}
                                    onClick={() => handleSuggestionClick(doc.name)}
                                    data-testid="suggestion-item"
                                    role="option"
                                    aria-selected="false"
                                    tabIndex={-1}
                                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-200 last:border-b-0 flex items-center"
                                >
                                    {doc.photo ? (
                                        <img 
                                            src={doc.photo} 
                                            alt={doc.name}
                                            className="w-8 h-8 rounded-full mr-3 object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${doc.name_initials || doc.name}&background=random`;
                                            }}
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full mr-3 bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                            {doc.name_initials || doc.name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{doc.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {doc.specialities?.map(spec => spec.name).join(', ')}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-4 gap-6">
             
                <aside className="md:col-span-1 bg-white p-4 rounded-lg shadow-md h-fit sticky top-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Filters</h2>

                    <div className="mb-5">
                        <h3 data-testid="filter-header-moc" className="text-lg font-medium mb-2 text-gray-700 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Consultation Mode
                        </h3>
                        <div className="space-y-2">
                            <label className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                <input
                                    type="radio"
                                    name="consultationType"
                                    value="Video Consult"
                                    checked={selectedConsultationType === 'Video Consult'}
                                    onChange={handleConsultationChange}
                                    data-testid="filter-video-consult"
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                /> 
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Video Consult
                                </span>
                            </label>
                            <label className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                <input
                                    type="radio"
                                    name="consultationType"
                                    value="In Clinic"
                                    checked={selectedConsultationType === 'In Clinic'}
                                    onChange={handleConsultationChange}
                                    data-testid="filter-in-clinic"
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                /> 
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    In Clinic
                                </span>
                            </label>
                            <label className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                <input
                                    type="radio"
                                    name="consultationType"
                                    value=""
                                    checked={selectedConsultationType === ''}
                                    onChange={handleConsultationChange}
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                /> 
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    All
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="mb-5">
                        <h3 data-testid="filter-header-speciality" className="text-lg font-medium mb-2 text-gray-700 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Speciality
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2 pr-1">
                            {specialties.length > 0 ? specialties.map((spec, index) => (
                                <label key={`${spec}-${index}`} className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value={spec}
                                        checked={selectedSpecialties.includes(spec)}
                                        onChange={handleSpecialtyChange}
                                        data-testid={getSpecialtyTestId(spec)}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    /> 
                                    <span>{spec}</span>
                                </label>
                            )) : (
                                !loading && <span className="text-gray-500 text-sm italic">No specialties found.</span>
                            )}
                            {loading && <span className="text-gray-500 text-sm italic">Loading specialties...</span>}
                        </div>
                    </div>

                    <div>
                        <h3 data-testid="filter-header-sort" className="text-lg font-medium mb-2 text-gray-700 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                            Sort By
                        </h3>
                        <div className="space-y-2">
                            <label className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                <input
                                    type="radio"
                                    name="sortBy"
                                    value=""
                                    checked={selectedSort === ''}
                                    onChange={handleSortChange}
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                /> 
                                Default
                            </label>
                            <label className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                <input
                                    type="radio"
                                    name="sortBy"
                                    value="fees"
                                    checked={selectedSort === 'fees'}
                                    onChange={handleSortChange}
                                    data-testid="sort-fees"
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                /> 
                                Fees (Low to High)
                            </label>
                            <label className="flex items-center text-gray-600 hover:text-gray-900 cursor-pointer">
                                <input
                                    type="radio"
                                    name="sortBy"
                                    value="experience"
                                    checked={selectedSort === 'experience'}
                                    onChange={handleSortChange}
                                    data-testid="sort-experience"
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                /> 
                                Experience (High to Low)
                            </label>
                        </div>
                    </div>
                </aside>

                <section className="md:col-span-3">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'} Found
                        </h2>
                        {loading && (
                            <div className="flex items-center text-gray-500">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredDoctors.length > 0 ? (
                                filteredDoctors.map((doc) => (
                                    <div key={doc.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-200">
                                        <div className="p-4 md:p-6">
                                            <div className="flex flex-col md:flex-row">
                                                {/* Doctor Photo */}
                                                <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                                                    {doc.photo ? (
                                                        <img
                                                            src={doc.photo}
                                                            alt={doc.name}
                                                            className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${doc.name_initials || doc.name}&background=random`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold border-4 border-blue-200">
                                                            {doc.name_initials || doc.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-grow">
                                                    <div className="flex flex-col md:flex-row md:justify-between">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-800 mb-1">{doc.name}</h3>
                                                            <div className="flex flex-wrap items-center mb-2">
                                                                {doc.specialities?.map((spec, i) => (
                                                                    <span key={i} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded mr-2 mb-2">
                                                                        {spec.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <p className="text-gray-600 text-sm mb-2">{doc.doctor_introduction}</p>
                                                        </div>

                                                        {doc.clinic?.address?.logo_url && (
                                                            <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-4">
                                                                <img
                                                                    src={doc.clinic.address.logo_url}
                                                                    alt={doc.clinic.name}
                                                                    className="h-16 w-auto object-contain"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                                        <div className="flex flex-wrap items-center justify-between">
                                                            <div className="flex items-center space-x-4 mb-2 md:mb-0">
                                                                <span className="flex items-center text-sm text-gray-600">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    {doc.experience || 'N/A'}
                                                                </span>
                                                                <span className="flex items-center text-sm text-gray-600">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                    </svg>
                                                                    Speaks: {doc.languages?.join(', ') || 'N/A'}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center space-x-4">
                                                                <span className="text-sm font-medium text-gray-600">
                                                                    <span className="text-lg font-bold text-blue-600">{doc.fees || 'N/A'}</span> consultation fee
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap items-center justify-between">
                                                            <div className="flex items-center space-x-4 mb-2 md:mb-0">
                                                                {doc.video_consult && (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                        </svg>
                                                                        Video Consult
                                                                    </span>
                                                                )}
                                                                {doc.in_clinic && (
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                        </svg>
                                                                        In Clinic
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                                                                    Book Appointment
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        
                                        {doc.clinic && (
                                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <svg className="flex-shrink-0 mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <div>
                                                        <span className="font-medium text-gray-700">{doc.clinic.name}</span> - {doc.clinic.address.address_line1}, {doc.clinic.address.locality}, {doc.clinic.address.city}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="mt-2 text-lg font-medium text-gray-900">No doctors found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {searchTerm || selectedConsultationType || selectedSpecialties.length > 0
                                            ? "Try adjusting your search or filter criteria"
                                            : "No doctors available at the moment"}
                                    </p>
                                    <div className="mt-6">
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setSelectedConsultationType('');
                                                setSelectedSpecialties([]);
                                                setSelectedSort('');
                                            }}
                                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}