import {
  Amenity,
  Booking,
  ChatMessage,
  ChatThread,
  Property,
  SellerLead,
  SellerListing,
  Unit,
} from '../types';

/**
 * Offline fixtures used by the service layer until the backend exists.
 * Services (not screens) import this file, so swapping to apiClient calls touches only services.
 */
export const mockProperties: Property[] = [
  { id: 'skyline', name: 'Skyline Heights', area: 'Kondapur, Hyderabad', config: '2, 3 & 4 BHK Apartments', price: '₹1.25 Cr*', sqft: '1200 - 2400 sq.ft.', facing: 'East Facing', status: 'Ready to Move', possession: 'Dec 2026', rating: 4.5, photos: 18, tone: 0 },
  { id: 'green', name: 'Green Valley Residences', area: 'Gachibowli, Hyderabad', config: '2 & 3 BHK Apartments', price: '₹1.45 Cr*', sqft: '1150 - 1850 sq.ft.', facing: 'West Facing', status: 'Under Construction', possession: 'Jun 2026', rating: 4.3, photos: 15, tone: 1 },
  { id: 'urban', name: 'Urban Elite', area: 'Nallagandla, Hyderabad', config: '2, 3 & 4 BHK Apartments', price: '₹98 L*', sqft: '1100 - 2200 sq.ft.', facing: 'North Facing', status: 'Ready to Move', possession: 'Mar 2027', rating: 4.2, photos: 20, tone: 2 },
  { id: 'lotus', name: 'Lotus Park View', area: 'Miyapur, Hyderabad', config: '2 & 3 BHK Apartments', price: '₹1.10 Cr*', sqft: '1600 sq.ft.', facing: 'East Facing', status: 'Under Construction', possession: 'Jun 2027', rating: 4.0, photos: 12, tone: 3 },
];

export const mockAmenities: Amenity[] = [
  { icon: 'home-outline', label: 'Clubhouse' },
  { icon: 'water-outline', label: 'Swimming Pool' },
  { icon: 'barbell-outline', label: 'Gym' },
  { icon: 'happy-outline', label: 'Children Play Area' },
  { icon: 'leaf-outline', label: 'Landscaped Gardens' },
  { icon: 'shield-checkmark-outline', label: '24x7 Security' },
  { icon: 'flash-outline', label: 'Power Backup' },
  { icon: 'car-outline', label: 'Car Parking' },
  { icon: 'body-outline', label: 'Yoga Deck' },
  { icon: 'people-outline', label: 'Multipurpose Hall' },
];

export const mockUnits: Unit[] = [
  { id: '2bhk', name: '2 BHK Apartment', sqft: '1200 sq.ft.', facing: 'East Facing', price: '₹1.25 Cr*' },
  { id: '3bhk', name: '3 BHK Apartment', sqft: '1650 sq.ft.', facing: 'West Facing', price: '₹1.65 Cr*' },
  { id: '4bhk', name: '4 BHK Apartment', sqft: '2200 sq.ft.', facing: 'East Facing', price: '₹2.25 Cr*' },
];

export const mockBookings: Booking[] = [
  { id: 'BK12456', name: 'Skyline Heights', config: '2, 3 & 4 BHK Apartments', area: 'Kondapur, Hyderabad', date: '22 May 2024', day: 'Wednesday', time: '02:00 PM', type: 'Site Visit', status: 'Upcoming' },
  { id: 'BK11234', name: 'Green Valley Residences', config: '2 & 3 BHK Apartments', area: 'Gachibowli, Hyderabad', date: '10 May 2024', day: 'Friday', time: '11:00 AM', type: 'Video Call', status: 'Completed' },
  { id: 'BK10456', name: 'Urban Elite', config: '2, 3 & 4 BHK Apartments', area: 'Nallagandla, Hyderabad', date: '02 May 2024', day: 'Thursday', time: '04:00 PM', type: 'Virtual Tour', status: 'Completed' },
  { id: 'BK09876', name: 'Lotus Park View', config: '2 & 3 BHK Apartments', area: 'Miyapur, Hyderabad', date: '28 Apr 2024', day: 'Sunday', time: '05:00 PM', type: 'Site Visit', status: 'Cancelled' },
];

export const mockChats: ChatThread[] = [
  { id: '1', name: 'Skyline Heights', role: 'Project Expert', lastMessage: 'Hi Rahul, Thank you for your…', time: '10:30 AM', unread: true },
  { id: '2', name: 'Green Valley Residences', role: 'Project Expert', lastMessage: 'Sure, Let me share the details…', time: 'Yesterday', unread: true },
  { id: '3', name: 'Urban Elite', role: 'Project Expert', lastMessage: 'Please find attached the floor…', time: 'Yesterday' },
  { id: '4', name: 'Lotus Park View', role: 'Project Expert', lastMessage: 'Let me know if you need any…', time: '2 Days ago' },
  { id: '5', name: 'Customer Support', role: 'Support Team', lastMessage: 'How can we help you today?', time: '2 Days ago' },
  { id: '6', name: 'Dream City Homes', role: 'Project Expert', lastMessage: 'Thank you for showing interest…', time: '3 Days ago' },
];

export const mockMessages: ChatMessage[] = [
  { id: 'm1', fromMe: false, text: 'Hi Rahul! 👋 Thank you for showing interest in Skyline Heights. How can I help you today?', time: '10:28 AM' },
  { id: 'm2', fromMe: true, text: "Hi, I'm interested in 2 BHK apartments. Can you share more details about pricing and availability?", time: '10:29 AM' },
  { id: 'm3', fromMe: false, text: 'Sure! Please find the details below. 2 BHK • 1200 sq.ft. • East Facing • ₹1.25 Cr* Onwards', time: '10:30 AM' },
  { id: 'm4', fromMe: false, text: 'Let me know if you would like to schedule a site visit.', time: '10:31 AM' },
  { id: 'm5', fromMe: true, text: 'Yes, please schedule a visit for this weekend.', time: '10:32 AM' },
  { id: 'm6', fromMe: false, text: 'Great! I will share the available time slots with you.', time: '10:33 AM' },
];

export const mockSellerListings: SellerListing[] = [
  { id: 's1', title: '2 BHK Apartment in Kondapur', area: 'Kondapur, Hyderabad', price: '₹75,00,000', sqft: '1200 sq.ft.', purpose: 'For Sale', status: 'Active', views: 1245, leads: 32, saves: 38 },
  { id: 's2', title: '3 BHK Flat in Gachibowli', area: 'Gachibowli, Hyderabad', price: '₹1,25,00,000', sqft: '1650 sq.ft.', purpose: 'For Sale', status: 'Active', views: 1102, leads: 40, saves: 36 },
  { id: 's3', title: '2 BHK Apartment in Miyapur', area: 'Miyapur, Hyderabad', price: '₹22,000 / Month', sqft: '1100 sq.ft.', purpose: 'For Rent', status: 'Active', views: 658, leads: 21, saves: 12 },
  { id: 's4', title: 'New Property (Draft)', area: 'Madhapur, Hyderabad', price: '₹85,00,000', sqft: '1500 sq.ft.', purpose: 'Draft', status: 'Incomplete', views: 0, leads: 0, saves: 0 },
];

export const mockLeads: SellerLead[] = [
  { id: 'l1', name: 'Ramesh Agarwal', initials: 'RA', kind: 'New Lead', message: "Hi, I'm interested in your 2 BHK flat…", time: '10:30 AM', unread: 2 },
  { id: 'l2', name: 'Priya Sharma', initials: 'PS', kind: 'Enquiry', message: 'Is the property still available?', time: '09:15 AM', unread: 1 },
  { id: 'l3', name: 'Ankit Agarwal', initials: 'AA', kind: 'Enquiry', message: 'Can we schedule a visit this weekend?', time: 'Yesterday', unread: 2 },
  { id: 'l4', name: 'Suresh Mehta', initials: 'SM', kind: 'Lead', message: 'Thanks for the details. Please share…', time: 'Yesterday', unread: 0 },
  { id: 'l5', name: 'Neha Verma', initials: 'NV', kind: 'Enquiry', message: 'What is the maintenance charge?', time: '17 May', unread: 1 },
  { id: 'l6', name: 'Vikram Reddy', initials: 'VR', kind: 'Lead', message: 'I am looking for 3 BHK in Kondapur.', time: '16 May', unread: 0 },
];
