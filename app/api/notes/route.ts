import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

// GET - Fetch all notes
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    // Convert database records to Note format
    const notes = (data || []).map((note: {
      id: string;
      text: string;
      checked: boolean | null;
      checked_at: string | null;
      created_at: string;
      url: string | null;
      url_title: string | null;
      summary: string | null;
    }) => ({
      id: note.id,
      text: note.text,
      checked: note.checked || false,
      checkedAt: note.checked_at ? new Date(note.checked_at) : null,
      createdAt: new Date(note.created_at),
      url: note.url || undefined,
      urlTitle: note.url_title || undefined,
      summary: note.summary || undefined,
    }));

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error in GET /api/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, text, checked, checkedAt, createdAt, url, urlTitle, summary } = body;

    if (!id || !text) {
      return NextResponse.json(
        { error: 'id and text are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        id,
        text,
        checked: checked || false,
        checked_at: checkedAt || null,
        created_at: createdAt || new Date().toISOString(),
        url: url || null,
        url_title: urlTitle || null,
        summary: summary || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }

    const note = {
      id: data.id,
      text: data.text,
      checked: data.checked || false,
      checkedAt: data.checked_at ? new Date(data.checked_at) : null,
      createdAt: new Date(data.created_at),
      url: data.url || undefined,
      urlTitle: data.url_title || undefined,
    };

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update a note
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, checked, checkedAt, urlTitle } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof checked === 'boolean') {
      updateData.checked = checked;
      updateData.checked_at = checkedAt || null;
    }
    if (urlTitle !== undefined) {
      updateData.url_title = urlTitle || null;
    }

    const { data, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    const note = {
      id: data.id,
      text: data.text,
      checked: data.checked || false,
      checkedAt: data.checked_at ? new Date(data.checked_at) : null,
      createdAt: new Date(data.created_at),
      url: data.url || undefined,
      urlTitle: data.url_title || undefined,
      summary: data.summary || undefined,
    };

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error in PATCH /api/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notes (used for cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json(
        { error: 'ids parameter is required' },
        { status: 400 }
      );
    }

    const noteIds = ids.split(',');

    const { error } = await supabase
      .from('notes')
      .delete()
      .in('id', noteIds);

    if (error) {
      console.error('Error deleting notes:', error);
      return NextResponse.json(
        { error: 'Failed to delete notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

