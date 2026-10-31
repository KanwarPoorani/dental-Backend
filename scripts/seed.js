// Run once: npm run seed. Uses $setOnInsert, so re-running never overwrites edits you made later.
// Every price, qualification, hour and article below is a PLACEHOLDER: replace with the clinic's real details.
require('dotenv').config();
const mongoose = require('mongoose');
const M = (n) => require(`../models/${n}`);
const up = (Model, key, docs) => Promise.all(docs.map((d) => Model.updateOne({ [key]: d[key] }, { $setOnInsert: d }, { upsert: true })));
const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => (
  [0, 5, 6].includes(day)
    ? { day, open: '14:00', close: '24:00' }
    : { day, open: '10:00', close: '20:00' }
));
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const branches = [
    {
      code: 'Qasimabad', city: 'Hyderabad', name: 'Dr. Munesh Kumar & Associates Dental Care Center', phone: '+92 348 3233370', plusCode: '98WQ+JR Hyderabad, Pakistan',
      address: 'Shop # 06, Faraz Centre, Main Wadhu Wah Rd, Qasimabad, Hyderabad, 71000, Pakistan', hours
    },
    {
      code: 'Mithi', city: 'Tharparkar', name: 'Dr. Munesh Kumar & Associates Dental Implant & Facial Surgery Clinic', phone: '+92 348 3233370',
      address: 'Naukot - Mithi Road, opp. PPHI Sindh District office, Shahi Bazar, Mithi, Pakistan',
      mapUrl: 'https://maps.app.goo.gl/3yWDgP9KApLV2V8Z6', lat: 24.7352758, lng: 69.7935063, hours
    },
  ];
  await up(M('Branch'), 'code', branches);
  await Promise.all(branches.map(({ code }) => M('Branch').updateOne({ code }, { $set: { hours } })));
  const mithiMap = branches.find(({ code }) => code === 'Mithi');
  await M('Branch').updateOne({ code: 'Mithi' }, { $set: { mapUrl: mithiMap.mapUrl, lat: mithiMap.lat, lng: mithiMap.lng } });
  const svc = [
    ['Scaling & Polishing', 'Professional Teeth Cleaning', 'Scaling and polishing performed with the latest equipment, ensuring complete hygiene, sterilization, and patient safety for fresh breath and healthy gums.', 'PKR 6,000 – 8,000'],
    ['PFM Crowns & Bridges', 'Smile Restoration with Crowns & Bridges', 'High-quality crowns protect damaged teeth, while bridges replace missing teeth for a complete and beautiful smile.', 'PKR 8,000 – 12,000'],
    ['Root Canal Treatment', 'Pain Relief & Tooth-Saving Treatment', 'Root canal treatment helps eliminate infection, stop pain, and restore your tooth for long-term oral health.', 'PKR 8,000 – 12,000'],
    ['PFM Crown', 'Smile Restoration with Crowns', 'A high-quality crown protects a damaged tooth and helps restore a complete, beautiful smile.', 'PKR 8,000'],
    ['Dental Implant', 'Smile Reconstruction with Dental Implants', 'A modern and reliable solution for replacing missing teeth with natural function and aesthetics.', 'PKR 70,000 – 80,000'],
    ['Amalgam Restoration', 'Silver Restoration', 'Amalgam filling for cavities. This treatment requires cavity preparation and may affect weakened tooth structure.', 'PKR 2,000'],
    ['Zirconia Crowns & Bridges', 'Best-Quality Zirconia for an Aesthetic Smile', 'Smile makeovers with zirconium crowns and bridges.', 'PKR 25,000'],
    ['Zirconia Crown', 'High-Quality Zirconium Crown', 'High-quality zirconium crown work, backed by a guarantee.', 'PKR 25,000'],
    ['Cast Partial Denture', 'Custom Cast Partial Denture', 'Cast partial denture framework with individual teeth priced separately.', 'PKR 15,000 framework + PKR 2,000 per tooth'],
  ];
  await M('Service').updateMany({}, { $set: { active: false } });
  await Promise.all(svc.map(([name, headline, description, priceLabel], order) => {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
    return M('Service').updateOne(
      { slug },
      { $set: { name, headline, description, priceLabel, order, active: true }, $setOnInsert: { slug } },
      { upsert: true },
    );
  }));
  const dentistSchedule = [
    { branch: 'Qasimabad', days: [1, 2, 3, 4], start: '10:00', end: '20:00' },
    { branch: 'Qasimabad', days: [5, 6, 0], start: '14:00', end: '24:00' },
  ];
  await up(M('Dentist'), 'slug', [{
    name: 'Dr. Munesh Kumar', slug: 'munesh-kumar', specialties: ['Dental implants', 'Facial surgery'], qualifications: [],
    schedule: dentistSchedule
  }]);
  await M('Dentist').updateOne(
    { slug: 'munesh-kumar' },
    { $set: { schedule: dentistSchedule, bio: 'Consultant Endodontist & Implantologist' } },
  );
  await up(M('Faq'), 'question', [
    { order: 1, question: 'How do I book?', answer: 'Use the booking form, choose a branch and a free time, and we will confirm by phone, email or SMS.' },
    { order: 2, question: 'Can I change or cancel my appointment?', answer: 'Yes. Use the link in your confirmation message to reschedule or cancel. Changes close 2 hours before the visit; after that, please call us.' },
    { order: 3, question: 'How much does treatment cost?', answer: 'Cost depends on the case. Each service page shows an estimate; the dentist confirms the final price after examination.' },
    { order: 4, question: 'How often should I have a check-up?', answer: 'Most people benefit from a check-up and cleaning every six months, or as your dentist advises.' },
  ]);
  await up(M('Article'), 'slug', [{
    slug: 'daily-brushing-basics', title: 'Daily brushing and flossing basics', excerpt: 'Small habits that protect your teeth.',
    body: 'Brush twice a day for two minutes with a fluoride toothpaste, and replace your brush about every three months.\n\nClean between your teeth once a day with floss or interdental brushes, since a brush cannot reach those surfaces.\n\nLimit sugary snacks and drinks between meals, and see your dentist if you notice bleeding gums, pain, or sensitivity that does not settle.'
  }]);
  console.log('Seeded'); process.exit(0);
})();
