import Link from 'next/link';
import Image from 'next/image';
import { blogPosts } from '@/lib/blog-data';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Blog | Yabalitsa',
  description: 'Τα τελευταία νέα, συμβουλές και οδηγοί για επαγγελματίες διαχείρισης γηπέδων 5x5 και αθλητικών ακαδημιών στην Ελλάδα.',
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-[#040D12] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B151C]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center text-zinc-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            Επιστροφή
          </Link>
          <Image src="/yabalo.png" alt="Yabalitsa Logo" width={140} height={28} className="filter brightness-0 invert" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 lg:px-6 pt-32 pb-24">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md">
            Yabalitsa <span className="text-[#74ee16]">Blog</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Insights, συμβουλές και οδηγοί για τη ψηφιοποίηση των αθλητικών κέντρων, των ακαδημιών και των γηπέδων 5x5.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {blogPosts.map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="group flex flex-col bg-[#0B151C] border border-white/10 rounded-3xl overflow-hidden hover:border-[#74ee16]/40 hover:shadow-[0_0_30px_rgba(116,238,22,0.1)] transition-all duration-300"
            >
              <div className="relative w-full h-64 overflow-hidden border-b border-white/10">
                <Image 
                  src={post.image} 
                  alt={post.title} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 mb-4 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {post.readTime}</span>
                </div>
                <h2 className="text-2xl font-bold mb-4 group-hover:text-[#74ee16] transition-colors line-clamp-2">
                  {post.title}
                </h2>
                <p className="text-zinc-400 leading-relaxed max-w-none line-clamp-3 flex-1 mb-6">
                  {post.excerpt}
                </p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {post.seoKeywords.slice(0, 2).map((keyword) => (
                    <span key={keyword} className="bg-white/5 text-zinc-300 px-3 py-1 rounded-full text-xs font-medium border border-white/5">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
