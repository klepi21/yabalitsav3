import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'
import Image from 'next/image'

export function Features() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-16 px-6">
                <div className="relative z-10 grid items-center gap-4 md:grid-cols-2 md:gap-12">
                    <h2 className="text-4xl font-semibold text-black">Το σύστημα διαχείρισης Yabalitsa ενώνει όλες τις λειτουργίες του γηπέδου σας</h2>
                    <p className="max-w-sm sm:ml-auto text-gray-700">Ενδυναμώστε το γήπεδό σας με ολοκληρωμένα εργαλεία διαχείρισης που προσαρμόζονται στις ανάγκες σας, είτε προτιμάτε διαχείριση κρατήσεων σε πραγματικό χρόνο είτε αναλυτικό ταμπλό.</p>
                </div>
                <div className="relative rounded-3xl p-3 md:-mx-8 lg:col-span-3">
                    <div className="aspect-[88/36] relative">
                        <Image src="/screnn.png" className="absolute inset-0 z-10 rounded-2xl" alt="Yabalitsa management dashboard" width={2797} height={1137} />
                    </div>
                </div>
                <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4 mt-32">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Zap className="size-4 text-black" />
                            <h3 className="text-sm font-medium text-black">Πραγματικός Χρόνος</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Ζωντανές ενημερώσεις κρατήσεων και άμεσες ειδοποιήσεις για όλες τις δραστηριότητες του γηπέδου και τις αλληλεπιδράσεις με τους πελάτες.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Cpu className="size-4 text-black" />
                            <h3 className="text-sm font-medium text-black">Αναλυτικά</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Ολοκληρωμένες αναφορές και πληροφορίες για να βελτιστοποιήσετε την απόδοση και τα έσοδα του γηπέδου σας.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Lock className="size-4 text-black" />
                            <h3 className="text-sm font-medium text-black">Ασφαλές</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Ασφάλεια επιχειρηματικού επιπέδου με κρυπτογραφημένα δεδομένα και ασφαλή επεξεργασία πληρωμών για όλες τις συναλλαγές.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-black" />
                            <h3 className="text-sm font-medium text-black">Έξυπνα Χαρακτηριστικά</h3>
                        </div>
                        <p className="text-gray-600 text-sm">Συστάσεις με τεχνητή νοημοσύνη και αυτοματοποιημένες ροές εργασίας για να απλοποιήσετε τη διαχείριση του γηπέδου σας.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
