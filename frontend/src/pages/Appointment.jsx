import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import RelatedContractors from '../components/RelatedContractors';
import axios from 'axios';
import { toast } from 'react-toastify';

const Appointment = () => {
    const { conId } = useParams();
    const { contractors, currencySymbol, backendUrl, token, getContractorsData } = useContext(AppContext);
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const [conInfo, setConInfo] = useState(null);
    const [conSlots, setConSlots] = useState([]);
    const [slotIndex, setSlotIndex] = useState(0);
    const [slotTime, setSlotTime] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        if (contractors.length > 0) {
            const foundContractor = contractors.find((con) => con._id === conId);
            setConInfo(foundContractor);
        }
    }, [contractors, conId]);

    useEffect(() => {
        if (conInfo) {
            getAvailableSlots();
        }
    }, [conInfo]);

    const getAvailableSlots = async () => {
        if (!conInfo || !conInfo.slots_booked) return;

        setConSlots([]);

        let today = new Date();

        for (let i = 0; i < 7; i++) {
            let currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            
            let endTime = new Date(today);
            endTime.setDate(today.getDate() + i);
            endTime.setHours(21, 0, 0, 0);

            if (today.getDate() === currentDate.getDate()) {
                currentDate.setHours(Math.max(currentDate.getHours() + 1, 10));
                currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0);
            } else {
                currentDate.setHours(10);
                currentDate.setMinutes(0);
            }

            let timeSlots = [];

            while (currentDate < endTime) {
                let formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let day = currentDate.getDate();
                let month = currentDate.getMonth() + 1;
                let year = currentDate.getFullYear();

                const slotDate = `${day}_${month}_${year}`;
                const slotTime = formattedTime;

                const isSlotAvailable = !conInfo.slots_booked[slotDate]?.includes(slotTime);

                if (isSlotAvailable) {
                    timeSlots.push({ datetime: new Date(currentDate), time: formattedTime });
                }

                currentDate.setMinutes(currentDate.getMinutes() + 30);
            }

            setConSlots((prev) => [...prev, timeSlots]);
        }
    };

    const bookAppointment = async () => {
        if (!token) {
            toast.warning('Login to book an appointment');
            return navigate('/login');
        }

        const date = conSlots[slotIndex][0]?.datetime;

        if (!date) {
            toast.error('Please select a valid slot.');
            return;
        }

        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();

        const slotDate = `${day}_${month}_${year}`;

        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/book-appointment',
                { conId, slotDate, slotTime },
                { headers: { token } }
            );

            if (data.success) {
                toast.success(data.message);
                getContractorsData();
                navigate('/my-appointments');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    };

    return conInfo ? (
        <div>
            {/* Contractor Details */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    {conInfo.image ? (
                        <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={conInfo.image} alt={conInfo.name} />
                    ) : (
                        <div className='bg-gray-200 w-full sm:max-w-72 rounded-lg h-48 flex items-center justify-center'>
                            No Image
                        </div>
                    )}
                </div>

                <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white'>
                    <p className='text-3xl font-medium text-gray-700'>
                        {conInfo.name}<img class="w-5" src="/src/assets/verified_icon.svg" alt="verified"/>
                    </p>
                    <p className='text-gray-600 text-sm mt-2'>{conInfo.degree} - {conInfo.speciality}</p>
                    <p className='text-gray-600 mt-3 whitespace-pre-line'>{conInfo.about}</p>
                    <p className='text-gray-600 font-medium mt-4'>Appointment fee: <span className='text-gray-800'>₱{conInfo.fees}</span></p>
                </div>
            </div>

            {/* Booking Slots */}
            <div className="sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656]">
                <p>Booking slots</p>
                <div className="flex gap-3 items-center w-full overflow-x-scroll mt-4">
                    {conSlots.length > 0 &&
                        conSlots.map((item, index) => (
                            <div 
                                key={index} 
                                onClick={() => setSlotIndex(index)} 
                                className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-[#DDDDDD]'}`}
                            >
                                <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                                <p>{item[0] && item[0].datetime.getDate()}</p>
                            </div>
                        ))}
                </div>

                <div className="flex items-center gap-3 w-full overflow-x-scroll mt-4">
                    {conSlots.length > 0 &&
                        conSlots[slotIndex]?.map((item, index) => (
                            <p 
                                key={index} 
                                onClick={() => setSlotTime(item.time)} 
                                className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime ? 'bg-primary text-white' : 'text-[#949494] border border-[#B4B4B4]'}`}
                            >
                                {item.time.toLowerCase()}
                            </p>
                        ))}
                </div>

                <button 
                    onClick={bookAppointment} 
                    className="bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6"
                >
                    Book an appointment
                </button>
            </div>

            {/* Related Contractors */}
            <RelatedContractors speciality={conInfo.speciality} conId={conId} />
        </div>
    ) : null;
};

export default Appointment;
