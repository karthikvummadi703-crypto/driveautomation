import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { SectionHeading } from './SectionHeading';
import { ChevronDownIcon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

const FAQS = [
  {
    question: 'Where do my uploaded files actually go?',
    answer:
      'Files are sent to the n8n webhook, which uploads them directly into the Google Drive account connected to the automation. You receive a shareable Drive link for every successful upload.',
  },
  {
    question: 'Why do email users get asked for permission first?',
    answer:
      'To keep things transparent and safe, email/password accounts must grant explicit upload permission once. That choice is stored in the Firestore permissions collection and can be revoked anytime from Settings.',
  },
  {
    question: 'What file types and sizes are supported?',
    answer:
      'Images, videos, audio, PDFs, documents, archives, and code files are all supported. The dashboard warns you if a file exceeds the configured maximum size before the upload starts.',
  },
  {
    question: 'Is my upload history stored securely?',
    answer:
      'Yes. Upload metadata lives in Cloud Firestore under each user’s document in the uploadHistory collection. Only authenticated users can access their own records.',
  },
  {
    question: 'Do I need a Google account to sign in?',
    answer:
      'No. You can sign up with an email and password. Google sign-in is available for a faster, one-click experience and skips the permission step.',
  },
  {
    question: 'Can I retry a failed upload?',
    answer:
      'Absolutely. If the webhook fails or times out, DriveFlow shows an error dialog with a Retry button that re-queues the exact same file.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions?{' '}
              <span className="bg-gradient-to-r from-electric to-grape bg-clip-text text-transparent">
                Answered.
              </span>
            </>
          }
          description="Everything you need to know about uploading with DriveFlow."
        />

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={cn(
                  'overflow-hidden rounded-2xl border transition-colors duration-300',
                  open ? 'border-electric/40 bg-white/5' : 'border-white/10 bg-white/[0.03]',
                )}
              >
                <button
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-display text-base font-semibold text-white">
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                      open ? 'border-electric/40 bg-electric/10 text-electric' : 'border-white/15 text-slate-400',
                    )}
                  >
                    <ChevronDownIcon size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-400">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
