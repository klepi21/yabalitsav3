import { blogPosts } from '@/lib/blog-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = blogPosts.find((p) => p.slug === resolvedParams.slug);
  
  if (!post) {
    return {
      title: 'Not Found | Yabalitsa',
    };
  }

  return {
    title: `${post.title} | Blog | Yabalitsa`,
    description: post.excerpt,
    keywords: post.seoKeywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `https://yabalitsa.com/blog/${post.slug}`,
      images: [
        {
          url: post.image,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = blogPosts.find((p) => p.slug === resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="min-h-screen bg-[#040D12] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B151C]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[800px] mx-auto px-4 lg:px-6 h-20 flex items-center justify-between">
          <Link href="/blog" className="flex items-center text-zinc-400 hover:text-[#74ee16] transition-colors group">
            <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            Πίσω στο Blog
          </Link>
          <Link href="/">
            <Image src="/yabalo.png" alt="Yabalitsa Logo" width={110} height={22} className="filter brightness-0 invert" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[800px] mx-auto px-6 py-32">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-500 mb-8 uppercase tracking-widest">
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#74ee16]" /> {post.date}</span>
          <span>•</span>
          <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#74ee16]" /> {post.readTime}</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-[1.15] drop-shadow-lg text-white">
          {post.title}
        </h1>

        <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-12 shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-white/5">
          <Image 
            src={post.image} 
            alt={post.title} 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040D12] via-transparent to-transparent opacity-80" />
        </div>

        <div className="max-w-none text-lg leading-relaxed
                        [&>h2]:text-3xl [&>h2]:font-bold [&>h2]:mt-16 [&>h2]:mb-6 [&>h2]:text-white
                        [&>p]:text-zinc-400 [&>p]:mb-6
                        [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:text-zinc-400 [&>li]:mb-3
                        [&>strong]:text-white [&>strong]:font-bold
                        [&>a]:text-[#74ee16] [&>a]:underline"
             dangerouslySetInnerHTML={{ __html: post.content }} />
             
        <hr className="my-16 border-white/10" />
        
        <div className="bg-[#0B151C] border border-[#74ee16]/20 rounded-3xl p-8 text-center shadow-[0_0_30px_rgba(116,238,22,0.1)]">
          <h3 className="text-2xl font-bold mb-4 text-white">Είστε ιδιοκτήτης αθλητικού κέντρου;</h3>
          <p className="text-zinc-400 mb-8">Η κορυφαία πλατφόρμα διαχείρισης γηπέδων 5x5 και ακαδημιών στην Ελλάδα σας δίνει τον έλεγχο.</p>
          <Link 
            href="https://www.yabalitsa.com/for-venues"
            target="_blank"
            className="inline-flex px-8 py-4 font-bold text-black bg-[#74ee16] hover:bg-[#5dc611] rounded-2xl transition-all shadow-lg hover:-translate-y-1 items-center justify-center mx-auto"
          >
            Ξεκινήστε την Ψηφιοποίηση
          </Link>
        </div>
      </main>
    </article>
  );
}
